import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
} from "date-fns"
import { Prisma } from "@/generated/prisma/client"
import {
  startOfDayKST,
  startOfMonthKST,
  endOfMonthKST,
  toKSTLocal,
} from "@/lib/date-utils"

const querySchema = z.object({
  period: z.enum(["daily", "monthly"]).default("monthly"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = querySchema.safeParse({
      period: searchParams.get("period") ?? "monthly",
      year: searchParams.get("year") ?? new Date().getFullYear(),
      month: searchParams.get("month") ?? undefined,
    })

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { period, year, month } = parseResult.data

    // KST 기준 날짜 범위 계산
    let dateStart: Date
    let dateEnd: Date

    if (period === "daily" && month) {
      dateStart = startOfMonthKST(year, month)
      dateEnd = endOfMonthKST(year, month)
    } else {
      dateStart = startOfMonthKST(year, 1)
      dateEnd = endOfMonthKST(year, 12)
    }

    const today = startOfDayKST()
    const truncUnit = period === "daily" && month ? "day" : "month"

    // 모든 집계를 DB 레벨에서 병렬 실행
    const [
      summaryByStatus,
      revenueByStatus,
      uniqueStoresResult,
      chartData,
      topStoresData,
      outstandingRecords,
      expenseAggregate,
    ] = await Promise.all([
      // 1) collectionStatus별 건수 (summary + 파이차트 공용)
      prisma.workRecord.groupBy({
        by: ["collectionStatus"],
        _count: true,
        where: { date: { gte: dateStart, lte: dateEnd } },
      }),

      // 2) collectionStatus별 매출 합계 (총매출 + 미수금액)
      prisma.$queryRaw<{ collectionStatus: string; total: bigint }[]>`
        SELECT wr."collectionStatus", COALESCE(SUM(ri.amount), 0) as total
        FROM "WorkRecord" wr
        LEFT JOIN "RecordItem" ri ON ri."workRecordId" = wr.id
        WHERE wr.date >= ${dateStart} AND wr.date <= ${dateEnd}
        GROUP BY wr."collectionStatus"
      `,

      // 3) 고유 매장 수
      prisma.workRecord.findMany({
        where: { date: { gte: dateStart, lte: dateEnd }, storeId: { not: null } },
        distinct: ["storeId"],
        select: { storeId: true },
      }),

      // 4) 기간별 매출 (차트) - KST 타임존 기준 DATE_TRUNC
      prisma.$queryRaw<{ period: Date; revenue: bigint }[]>`
        SELECT DATE_TRUNC(${truncUnit}, wr.date ${Prisma.raw("AT TIME ZONE 'Asia/Seoul'")}) as period, COALESCE(SUM(ri.amount), 0) as revenue
        FROM "WorkRecord" wr
        LEFT JOIN "RecordItem" ri ON ri."workRecordId" = wr.id
        WHERE wr.date >= ${dateStart} AND wr.date <= ${dateEnd}
        GROUP BY period ORDER BY period
      `,

      // 5) 매출 상위 5개 매장
      prisma.$queryRaw<{ group_key: string; name: string; amount: bigint }[]>`
        SELECT
          COALESCE(wr."storeId", wr."storeNameSnapshot", '알 수 없음') as group_key,
          MAX(COALESCE(wr."storeNameSnapshot", '알 수 없음')) as name,
          COALESCE(SUM(ri.amount), 0) as amount
        FROM "WorkRecord" wr
        LEFT JOIN "RecordItem" ri ON ri."workRecordId" = wr.id
        WHERE wr.date >= ${dateStart} AND wr.date <= ${dateEnd}
        GROUP BY group_key
        ORDER BY amount DESC
        LIMIT 5
      `,

      // 6) 최근 미수금 5건 (오늘 이전만)
      prisma.workRecord.findMany({
        where: {
          collectionStatus: "UNCOLLECTED",
          date: { gte: dateStart, lte: dateEnd, lt: today },
        },
        include: { items: { select: { amount: true } } },
        orderBy: { date: "desc" },
        take: 5,
      }),

      // 7) 비용 합계
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: dateStart, lte: dateEnd } },
      }),
    ])

    // === summary 조립 ===
    const totalVisits = summaryByStatus.reduce((sum, s) => sum + s._count, 0)

    let totalRevenue = 0
    let outstandingAmount = 0
    for (const row of revenueByStatus) {
      const amount = Number(row.total)
      totalRevenue += amount
      if (row.collectionStatus === "UNCOLLECTED") {
        outstandingAmount = amount
      }
    }

    const totalExpenses = Number(expenseAggregate._sum.amount ?? 0)

    const summary = {
      totalRevenue,
      totalExpenses,
      outstandingAmount,
      totalVisits,
      uniqueStores: uniqueStoresResult.length,
    }

    // === chart 조립 (빈 날짜/월 채우기) ===
    // toKSTLocal로 보정하여 eachDayOfInterval/eachMonthOfInterval이 KST 날짜 생성
    const chartRevenueMap = new Map<string, number>()

    if (period === "daily" && month) {
      const days = eachDayOfInterval({ start: toKSTLocal(dateStart), end: toKSTLocal(dateEnd) })
      for (const day of days) {
        chartRevenueMap.set(format(day, "MM/dd"), 0)
      }
      for (const row of chartData) {
        // DATE_TRUNC AT TIME ZONE 결과는 "fake UTC" = KST 날짜
        const label = format(new Date(row.period), "MM/dd")
        chartRevenueMap.set(label, Number(row.revenue))
      }
    } else {
      const months = eachMonthOfInterval({ start: toKSTLocal(dateStart), end: toKSTLocal(dateEnd) })
      for (const m of months) {
        chartRevenueMap.set(format(m, "M월"), 0)
      }
      for (const row of chartData) {
        const label = format(new Date(row.period), "M월")
        chartRevenueMap.set(label, Number(row.revenue))
      }
    }

    const chart = Array.from(chartRevenueMap.entries()).map(([label, revenue]) => ({
      label,
      revenue,
    }))

    // === topStores 조립 ===
    const topStores = topStoresData.map((row) => ({
      name: row.name,
      amount: Number(row.amount),
    }))

    // === recentOutstanding 조립 ===
    const recentOutstanding = outstandingRecords.map((record) => ({
      id: record.id,
      date: format(toKSTLocal(record.date), "yyyy-MM-dd"),
      storeName: record.storeNameSnapshot ?? "알 수 없음",
      totalAmount: record.items.reduce((sum, item) => sum + item.amount, 0),
    }))

    // === 수금 현황 (파이 차트용) ===
    const statusMap: Record<string, number> = { COLLECTED: 0, UNCOLLECTED: 0, CLOSED: 0 }
    for (const s of summaryByStatus) {
      statusMap[s.collectionStatus] = s._count
    }

    return apiSuccess({
      summary,
      chart,
      topStores,
      recentOutstanding,
      collectionStatus: {
        collected: statusMap.COLLECTED,
        uncollected: statusMap.UNCOLLECTED,
        closed: statusMap.CLOSED,
      },
    })
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error)
    return ApiErrors.internalError("대시보드 데이터 조회 중 오류가 발생했습니다")
  }
}
