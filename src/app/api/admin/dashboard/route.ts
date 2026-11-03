import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { eachMonthOfInterval, format, getDaysInMonth } from "date-fns"
import { Prisma } from "@/generated/prisma/client"
import {
  startOfMonthKST,
  endOfMonthKST,
  toKSTLocal,
  dateToKSTMidnight,
} from "@/lib/date-utils"
import { SALES_AMOUNT_CUTOVER_DATE } from "@/lib/sales-utils"

const querySchema = z.object({
  period: z.enum(["daily", "monthly"]).default("monthly"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

// KST 기준 DATE_TRUNC용 타임존 변환식
// date 컬럼은 timestamp without time zone이므로
// AT TIME ZONE 'UTC'로 먼저 UTC 해석 → AT TIME ZONE 'Asia/Seoul'로 KST 변환
const KST_TZ = Prisma.raw("AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'")

/**
 * 매출 집계 기준 금액 식
 *
 * 기준일(SALES_AMOUNT_CUTOVER_DATE) 이후 기록은 salesAmount(매출 원금),
 * 이전 기록은 salesAmount가 백필되지 않았으므로 amount(기존 방식)를 사용한다.
 * 수금 처리로 amount가 0/이월 이동되어도 기준일 이후 매출은 원래 날짜에 남는다.
 */
const cutoverDate = dateToKSTMidnight(SALES_AMOUNT_CUTOVER_DATE)
const salesAmountExpr = Prisma.sql`CASE WHEN wr.date >= ${cutoverDate} THEN ri."salesAmount" ELSE ri.amount END`

/** 기간별 매출 집계 (차트/비교용) */
async function fetchRevenueByPeriod(
  truncUnit: "day" | "month",
  dateStart: Date,
  dateEnd: Date,
) {
  return prisma.$queryRaw<{ period: Date; paymentType: string; revenue: bigint }[]>`
    SELECT DATE_TRUNC(${truncUnit}, wr.date ${KST_TZ}) as period, wr."paymentTypeSnapshot" as "paymentType", COALESCE(SUM(${salesAmountExpr}), 0) as revenue
    FROM "WorkRecord" wr
    LEFT JOIN "RecordItem" ri ON ri."workRecordId" = wr.id
    WHERE wr.date >= ${dateStart} AND wr.date <= ${dateEnd}
    GROUP BY period, wr."paymentTypeSnapshot" ORDER BY period
  `
}

/** 비교 기간 (전월/전전월) */
interface CompareRange {
  start: Date
  end: Date
  year: number
  month: number
}

/**
 * 비교 기간 계산 (매출 추이·누적 매출 차트 점선용)
 *
 * 일별 모드에서는 항상 monthsBack개월 전(1: 전월, 2: 전전월)과 같은 일자끼리 비교한다.
 * 연도 경계도 처리한다 (1월 조회 → 전년 12월/11월). 월별 모드는 "전월" 개념이 없어 null.
 */
function resolveCompareRange(
  period: "daily" | "monthly",
  year: number,
  month: number | undefined,
  monthsBack: number,
): CompareRange | null {
  if (period !== "daily" || !month) return null

  // 0부터 세는 월 일련번호로 바꿔 빼면 연도 경계를 따로 분기하지 않아도 된다
  const serial = year * 12 + (month - 1) - monthsBack
  const compareYear = Math.floor(serial / 12)
  const compareMonth = (serial % 12) + 1
  return {
    start: startOfMonthKST(compareYear, compareMonth),
    end: endOfMonthKST(compareYear, compareMonth),
    year: compareYear,
    month: compareMonth,
  }
}

/**
 * 비교 기간의 일(1~말일)별 매출 합계
 * 비교 기간에 존재하지 않는 날(예: 31일 ↔ 2월)은 키가 없다 → 차트에서 null(라인 끊김)
 */
function buildCompareRevenueMap(
  range: CompareRange | null,
  rows: readonly { period: Date; revenue: bigint }[],
): Map<number, number> {
  const map = new Map<number, number>()
  if (!range) return map

  const dayCount = getDaysInMonth(new Date(range.year, range.month - 1, 1))
  for (let day = 1; day <= dayCount; day++) {
    map.set(day, 0)
  }
  for (const row of rows) {
    // DB period(KST 벽시계 값의 timestamp without time zone → JS에서는 UTC로 해석됨) → 일자
    const day = new Date(row.period).getUTCDate()
    map.set(day, (map.get(day) ?? 0) + Number(row.revenue))
  }
  return map
}

/** 비교 기간 같은 일자 라벨 "MM/DD" (툴팁 표기용). 비교 기간에 없는 날은 null */
function compareDayLabel(
  range: CompareRange | null,
  revenueMap: Map<number, number>,
  day: number,
): string | null {
  return range && revenueMap.has(day)
    ? `${String(range.month).padStart(2, "0")}/${String(day).padStart(2, "0")}`
    : null
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

    const truncUnit = period === "daily" && month ? "day" : "month"
    const compareRange = resolveCompareRange(period, year, month, 1)
    const compare2Range = resolveCompareRange(period, year, month, 2)

    // 모든 집계를 DB 레벨에서 병렬 실행
    const [
      summaryByStatus,
      revenueByStatus,
      uniqueStoresResult,
      chartData,
      compareChartData,
      compare2ChartData,
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

      // 2) collectionStatus별 매출(salesAmount 기준) + 잔액(amount 기준) 합계
      //    총매출은 sales, 미수금액은 UNCOLLECTED의 outstanding을 사용
      prisma.$queryRaw<{ collectionStatus: string; sales: bigint; outstanding: bigint }[]>`
        SELECT wr."collectionStatus",
               COALESCE(SUM(${salesAmountExpr}), 0) as sales,
               COALESCE(SUM(ri.amount), 0) as outstanding
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

      // 4) 기간별 + 결제유형별 매출 (차트)
      fetchRevenueByPeriod(truncUnit, dateStart, dateEnd),

      // 4-1) 전월 비교 매출 (일별 모드)
      compareRange
        ? fetchRevenueByPeriod(truncUnit, compareRange.start, compareRange.end)
        : Promise.resolve([]),

      // 4-2) 전전월 비교 매출 (일별 모드)
      compare2Range
        ? fetchRevenueByPeriod(truncUnit, compare2Range.start, compare2Range.end)
        : Promise.resolve([]),

      // 5) 비용 추이 (항상 연도 전체 월별 집계)
      prisma.$queryRaw<{ period: Date; amount: bigint }[]>`
        SELECT DATE_TRUNC('month', e.date ${KST_TZ}) as period,
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

    let totalRevenue = 0
    let outstandingAmount = 0
    for (const row of revenueByStatus) {
      totalRevenue += Number(row.sales)
      if (row.collectionStatus === "UNCOLLECTED") {
        outstandingAmount = Number(row.outstanding)
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

    // === chart 조립 (빈 날짜/월 채우기 + 결제유형별 분리 + 비교값) ===
    type ChartEntry = { revenue: number; cash: number; account: number; card: number }
    // key: 일별 모드는 일(1~31), 월별 모드는 월(1~12) — 비교 기간과 같은 위치끼리 정렬하기 위한 인덱스
    const chartRevenueMap = new Map<number, ChartEntry>()
    const emptyEntry = (): ChartEntry => ({ revenue: 0, cash: 0, account: 0, card: 0 })

    // paymentType → 필드명 매핑
    const paymentTypeField: Record<string, keyof ChartEntry> = {
      CASH: "cash",
      ACCOUNT: "account",
      CARD: "card",
    }

    const isDaily = period === "daily" && !!month
    // DB period(KST 벽시계 값의 timestamp without time zone → JS에서는 UTC로 해석됨) → 인덱스(일 또는 월)
    const periodToIndex = (p: Date) =>
      isDaily ? new Date(p).getUTCDate() : new Date(p).getUTCMonth() + 1
    const indexToLabel = (idx: number) =>
      isDaily ? `${String(month).padStart(2, "0")}/${String(idx).padStart(2, "0")}` : `${idx}월`

    // 빈 날짜/월 채우기 (일별: 1~말일, 월별: 1~12월)
    const indexCount = isDaily ? getDaysInMonth(new Date(year, (month ?? 1) - 1, 1)) : 12
    for (let i = 1; i <= indexCount; i++) {
      chartRevenueMap.set(i, emptyEntry())
    }

    for (const row of chartData) {
      const idx = periodToIndex(row.period)
      const entry = chartRevenueMap.get(idx) ?? emptyEntry()
      const amount = Number(row.revenue)
      entry.revenue += amount
      const field = paymentTypeField[row.paymentType]
      if (field) entry[field] += amount
      chartRevenueMap.set(idx, entry)
    }

    // 전월/전전월 비교(매출 추이·누적 매출 차트 점선 전용): 일별 매출 합계. 월별 모드는 빈 Map
    const compareRevenueMap = buildCompareRevenueMap(compareRange, compareChartData)
    const compare2RevenueMap = buildCompareRevenueMap(compare2Range, compare2ChartData)

    const chart = Array.from(chartRevenueMap.entries()).map(([idx, entry]) => ({
      label: indexToLabel(idx),
      ...entry,
      compareRevenue: compareRevenueMap.get(idx) ?? null,
      compareLabel: compareDayLabel(compareRange, compareRevenueMap, idx),
      compare2Revenue: compare2RevenueMap.get(idx) ?? null,
      compare2Label: compareDayLabel(compare2Range, compare2RevenueMap, idx),
    }))

    // 전월이 당월보다 긴 달일 때(예: 9월 30일 조회 ↔ 8월 31일) 당월에 없는 일자의 전월/전전월 매출.
    // 누적 매출 차트가 세 달 중 일수가 가장 많은 쪽에 가로축을 맞추기 위해 사용한다.
    // 30일 달(4·6·9·11월)끼리는 이웃하지 않고 2월 앞은 1월(31일)이라, 당월이 31일 미만이면 전월은 항상 31일이다.
    // 즉 가장 긴 달은 언제나 당월 또는 전월 → 전월 일자 기준으로 만들고 전전월은 없는 날 null
    const compareTail = Array.from(compareRevenueMap.entries())
      .filter(([idx]) => idx > indexCount)
      .map(([idx, revenue]) => ({
        // 당월에 없는 날이라 "MM/DD" 대신 일자 번호만 라벨로 쓴다
        label: String(idx),
        compareRevenue: revenue,
        compareLabel: compareDayLabel(compareRange, compareRevenueMap, idx),
        compare2Revenue: compare2RevenueMap.get(idx) ?? null,
        compare2Label: compareDayLabel(compare2Range, compare2RevenueMap, idx),
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
      compareTail,
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
