import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { eachMonthOfInterval, format } from "date-fns"
import { Prisma } from "@/generated/prisma/client"
import {
  startOfMonthKST,
  endOfMonthKST,
  toKSTDateString,
  toKSTLocal,
} from "@/lib/date-utils"
import { getDailySalesSeries, type DailySalesRow } from "@/lib/reports/daily-sales"

const querySchema = z.object({
  period: z.enum(["daily", "monthly"]).default("monthly"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
  // 매출 그래프 비교 기준 (전월 동일 시점 / 전년 동일 시점)
  compare: z.enum(["none", "prevMonth", "prevYear"]).default("none"),
})

type Period = "daily" | "monthly"
type ComparePreset = "none" | "prevMonth" | "prevYear"

interface CompareRange {
  label: string
  from: string
  to: string
}

/** 해당 연월의 "YYYY-MM-DD" 시작/끝 */
function monthRangeStrings(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, "0")
  const lastDay = new Date(year, month, 0).getDate()

  return {
    from: `${year}-${mm}-01`,
    to: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  }
}

/**
 * 비교 구간 계산
 * - 일별 모드: 전월 또는 전년의 같은 월 (일자끼리 정렬)
 * - 월별 모드: 전년 전체 (월끼리 정렬). 전월 비교는 의미가 없어 무시한다.
 */
function resolveCompareRange(
  period: Period,
  year: number,
  month: number | undefined,
  compare: ComparePreset
): CompareRange | null {
  if (compare === "none") return null

  if (period === "daily" && month) {
    if (compare === "prevMonth") {
      const prevYear = month === 1 ? year - 1 : year
      const prevMonth = month === 1 ? 12 : month - 1

      return { label: `${prevYear}년 ${prevMonth}월`, ...monthRangeStrings(prevYear, prevMonth) }
    }

    return { label: `${year - 1}년 ${month}월`, ...monthRangeStrings(year - 1, month) }
  }

  if (compare === "prevYear") {
    return { label: `${year - 1}년`, from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
  }

  return null
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = querySchema.safeParse({
      period: searchParams.get("period") ?? "monthly",
      year: searchParams.get("year") ?? new Date().getFullYear(),
      month: searchParams.get("month") ?? undefined,
      compare: searchParams.get("compare") ?? "none",
    })

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { period, year, month, compare } = parseResult.data

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

    // 매출 시리즈 조회 범위 및 비교 구간
    const rangeFrom = toKSTDateString(dateStart)
    const rangeTo = toKSTDateString(dateEnd)
    const compareRange = resolveCompareRange(period, year, month, compare)

    // 모든 집계를 DB 레벨에서 병렬 실행
    const [
      summaryByStatus,
      revenueByStatus,
      uniqueStoresResult,
      salesSeries,
      compareSeries,
      expenseChartData,
      expenseAggregate,
      deletedStoresList,
      newlyAddedStoresList,
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

      // 4) 일별 매출 시리즈 (스냅샷 우선, 없는 날짜는 원장 계산으로 폴백)
      //    수금 처리가 과거 RecordItem.amount 를 0 으로 덮어쓰기 때문에
      //    원장 직접 집계 대신 DailySalesSnapshot 을 먼저 읽는다.
      getDailySalesSeries(rangeFrom, rangeTo),

      // 4-1) 비교 구간 시리즈 (전월/전년 동일 시점)
      compareRange
        ? getDailySalesSeries(compareRange.from, compareRange.to)
        : Promise.resolve(null),

      // 5) 비용 추이 (항상 연도 전체 월별 집계)
      // date 컬럼은 timestamp without time zone이므로
      // AT TIME ZONE 'UTC'로 먼저 UTC 해석 → AT TIME ZONE 'Asia/Seoul'로 KST 변환
      prisma.$queryRaw<{ period: Date; amount: bigint }[]>`
        SELECT DATE_TRUNC('month', e.date ${Prisma.raw("AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'")}) as period,
               COALESCE(SUM(e.amount), 0) as amount
        FROM "Expense" e
        WHERE e.date >= ${startOfMonthKST(year, 1)} AND e.date <= ${endOfMonthKST(year, 12)}
        GROUP BY period ORDER BY period
      `,

      // 7) 비용 합계
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: dateStart, lte: dateEnd } },
      }),

      // 8) 해당 기간 내 제거된 매장 목록 (근무기록 보유 매장만)
      prisma.store.findMany({
        where: {
          isDeleted: true,
          deletedAt: { gte: dateStart, lte: dateEnd },
          workRecords: { some: {} },
        },
        select: { id: true, name: true, address: true, deletedAt: true },
        orderBy: { deletedAt: "desc" },
      }),

      // 9) 해당 기간 내 새로 추가된 매장 목록 (isDeleted 무관, 근무기록 보유 매장만)
      prisma.store.findMany({
        where: {
          createdAt: { gte: dateStart, lte: dateEnd },
          workRecords: { some: {} },
        },
        select: { id: true, name: true, address: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ])

    // === summary 조립 ===
    const totalVisits = summaryByStatus.reduce((sum, s) => sum + s._count, 0)

    // 총매출은 그래프와 같은 시리즈에서 도출해 KPI 와 차트 합계를 일치시킨다.
    const totalRevenue = salesSeries.reduce((sum, row) => sum + row.totalRevenue, 0)

    // 미수금액은 현재 상태값이므로 원장에서 그대로 읽는다.
    let outstandingAmount = 0
    for (const row of revenueByStatus) {
      if (row.collectionStatus === "UNCOLLECTED") {
        outstandingAmount = Number(row.total)
      }
    }

    const totalExpenses = Number(expenseAggregate._sum.amount ?? 0)

    const summary = {
      totalRevenue,
      totalExpenses,
      outstandingAmount,
      totalVisits,
      uniqueStores: uniqueStoresResult.length,
      deletedStoresCount: deletedStoresList.length,
      newlyAddedStoresCount: newlyAddedStoresList.length,
    }

    // === deletedStores 조립 (KST 날짜 포맷) ===
    const deletedStores = deletedStoresList.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      deletedAt: store.deletedAt
        ? format(toKSTLocal(store.deletedAt), "yyyy-MM-dd")
        : "",
    }))

    // === newlyAddedStores 조립 (KST 날짜 포맷) ===
    const newlyAddedStores = newlyAddedStoresList.map((store) => ({
      id: store.id,
      name: store.name,
      address: store.address,
      createdAt: format(toKSTLocal(store.createdAt), "yyyy-MM-dd"),
    }))

    // === chart 조립 (일별 시리즈 → 기간 단위 롤업 + 비교 시리즈 정렬) ===
    // getDailySalesSeries 는 범위 내 모든 날짜를 채워 반환하므로 빈 구간 보정이 필요 없다.
    interface ChartBucket {
      key: string
      revenue: number
      cash: number
      account: number
      card: number
    }

    const isDaily = period === "daily" && month !== undefined

    // 일별은 "MM/dd" 라벨 + 일자 키, 월별은 "M월" 라벨 + 월 키로 묶는다.
    // 비교 구간과는 이 키(일자/월)로 맞춰야 "같은 날"끼리 비교된다.
    const bucketOf = (date: string): { label: string; key: string } => {
      const [, mm, dd] = date.split("-")

      return isDaily ? { label: `${mm}/${dd}`, key: dd } : { label: `${Number(mm)}월`, key: mm }
    }

    const rollUp = (rows: DailySalesRow[]): Map<string, ChartBucket> => {
      const buckets = new Map<string, ChartBucket>()

      for (const row of rows) {
        const { label, key } = bucketOf(row.date)
        const bucket = buckets.get(label) ?? { key, revenue: 0, cash: 0, account: 0, card: 0 }

        bucket.revenue += row.totalRevenue
        bucket.cash += row.cashRevenue
        bucket.account += row.accountRevenue
        bucket.card += row.cardRevenue
        buckets.set(label, bucket)
      }

      return buckets
    }

    const compareRevenueByKey = new Map<string, number>()
    if (compareSeries) {
      for (const bucket of rollUp(compareSeries).values()) {
        compareRevenueByKey.set(bucket.key, bucket.revenue)
      }
    }

    const chart = Array.from(rollUp(salesSeries).entries()).map(([label, bucket]) => ({
      label,
      revenue: bucket.revenue,
      cash: bucket.cash,
      account: bucket.account,
      card: bucket.card,
      // 대응되는 날/월이 비교 구간에 없으면 null (예: 31일 ↔ 30일인 달)
      compareRevenue: compareRange ? (compareRevenueByKey.get(bucket.key) ?? null) : null,
    }))

    // === expenseChart 조립 (월별 빈 월 채우기) ===
    const expenseChartMap = new Map<string, number>()
    const yearMonths = eachMonthOfInterval({
      start: toKSTLocal(startOfMonthKST(year, 1)),
      end: toKSTLocal(endOfMonthKST(year, 12)),
    })
    for (const m of yearMonths) {
      expenseChartMap.set(format(m, "M월"), 0)
    }
    for (const row of expenseChartData) {
      const label = format(new Date(row.period), "M월")
      expenseChartMap.set(label, (expenseChartMap.get(label) ?? 0) + Number(row.amount))
    }
    const expenseChart = Array.from(expenseChartMap.entries()).map(([label, amount]) => ({
      label,
      amount,
    }))

    // === 수금 현황 (파이 차트용) ===
    const statusMap: Record<string, number> = { COLLECTED: 0, UNCOLLECTED: 0, CLOSED: 0 }
    for (const s of summaryByStatus) {
      statusMap[s.collectionStatus] = s._count
    }

    return apiSuccess({
      summary,
      chart,
      compare: compareRange,
      expenseChart,
      deletedStores,
      newlyAddedStores,
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
