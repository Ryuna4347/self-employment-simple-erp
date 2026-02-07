import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  eachMonthOfInterval,
  startOfYear,
  endOfYear,
  format,
} from "date-fns"

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
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 },
      )
    }

    const { period, year, month } = parseResult.data

    // 날짜 범위 계산
    let dateStart: Date
    let dateEnd: Date

    if (period === "daily" && month) {
      // 일별: 해당 월의 시작~끝
      const targetDate = new Date(year, month - 1, 1)
      dateStart = startOfMonth(targetDate)
      dateEnd = endOfMonth(targetDate)
    } else {
      // 월별: 해당 연도 시작~끝
      dateStart = startOfYear(new Date(year, 0, 1))
      dateEnd = endOfYear(new Date(year, 0, 1))
    }

    // 해당 기간의 WorkRecord + items 조회
    const workRecords = await prisma.workRecord.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
      },
      include: {
        items: true,
      },
    })

    // === summary 계산 ===
    let totalRevenue = 0
    let outstandingAmount = 0
    const storeIds = new Set<string>()

    for (const record of workRecords) {
      const recordTotal = record.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )
      totalRevenue += recordTotal

      if (!record.isCollected) {
        outstandingAmount += recordTotal
      }

      if (record.storeId) {
        storeIds.add(record.storeId)
      }
    }

    const summary = {
      totalRevenue,
      outstandingAmount,
      totalVisits: workRecords.length,
      uniqueStores: storeIds.size,
    }

    // === chart 데이터 ===
    const chartMap = new Map<string, number>()

    if (period === "daily" && month) {
      // 일별: 해당 월의 각 날짜별 매출
      const days = eachDayOfInterval({ start: dateStart, end: dateEnd })
      for (const day of days) {
        chartMap.set(format(day, "MM/dd"), 0)
      }

      for (const record of workRecords) {
        const label = format(record.date, "MM/dd")
        const recordTotal = record.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        )
        chartMap.set(label, (chartMap.get(label) ?? 0) + recordTotal)
      }
    } else {
      // 월별: 해당 연도의 각 월별 매출
      const months = eachMonthOfInterval({ start: dateStart, end: dateEnd })
      for (const m of months) {
        chartMap.set(format(m, "M월"), 0)
      }

      for (const record of workRecords) {
        const label = format(record.date, "M월")
        const recordTotal = record.items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0,
        )
        chartMap.set(label, (chartMap.get(label) ?? 0) + recordTotal)
      }
    }

    const chart = Array.from(chartMap.entries()).map(([label, revenue]) => ({
      label,
      revenue,
    }))

    // === topStores: 매출 상위 5개 매장 ===
    const storeRevenueMap = new Map<
      string,
      { name: string; amount: number }
    >()

    for (const record of workRecords) {
      const storeName = record.storeNameSnapshot ?? "알 수 없음"
      const key = record.storeId ?? storeName
      const recordTotal = record.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )

      const existing = storeRevenueMap.get(key)
      if (existing) {
        existing.amount += recordTotal
      } else {
        storeRevenueMap.set(key, { name: storeName, amount: recordTotal })
      }
    }

    const topStores = Array.from(storeRevenueMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // === recentOutstanding: 최근 미수금 5건 ===
    const outstandingRecords = workRecords
      .filter((r) => !r.isCollected)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 5)

    const recentOutstanding = outstandingRecords.map((record) => ({
      id: record.id,
      date: format(record.date, "yyyy-MM-dd"),
      storeName: record.storeNameSnapshot ?? "알 수 없음",
      totalAmount: record.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    }))

    // === 수금 현황 (파이 차트용) ===
    const collectedCount = workRecords.filter((r) => r.isCollected).length
    const uncollectedCount = workRecords.filter((r) => !r.isCollected).length

    return NextResponse.json({
      success: true,
      data: {
        summary,
        chart,
        topStores,
        recentOutstanding,
        collectionStatus: {
          collected: collectedCount,
          uncollected: uncollectedCount,
        },
      },
    })
  } catch (error) {
    console.error("대시보드 데이터 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "대시보드 데이터 조회 중 오류가 발생했습니다" },
      { status: 500 },
    )
  }
}
