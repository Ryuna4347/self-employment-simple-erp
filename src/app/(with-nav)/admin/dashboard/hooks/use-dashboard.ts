import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 대시보드 요약 통계
interface DashboardSummary {
  totalRevenue: number
  totalExpenses: number
  outstandingAmount: number
  totalVisits: number
  uniqueStores: number
  deletedStoresCount: number
  newlyAddedStoresCount: number
}

// 제거된 매장
export interface DeletedStore {
  id: string
  name: string
  address: string
  deletedAt: string
}

// 추가된 매장
export interface NewlyAddedStore {
  id: string
  name: string
  address: string
  createdAt: string
}

// 차트 데이터 포인트
export interface ChartDataPoint {
  label: string
  revenue: number
  cash: number
  account: number
  card: number
  // 비교 기간 같은 위치(일/월)의 매출. 비교 미사용 또는 비교 기간에 없는 날짜면 null
  compareRevenue: number | null
}

// 비용 추이 차트 데이터 포인트
interface ExpenseChartDataPoint {
  label: string
  amount: number
}

// 수금 현황
interface CollectionStatus {
  collected: number
  uncollected: number
  closed: number
}

// 비교 기간 정보
export interface DashboardCompare {
  mode: DashboardCompareMode
  label: string // 예: "2026년 7월", "2025년"
  totalRevenue: number
}

// 대시보드 데이터
export interface DashboardData {
  summary: DashboardSummary
  chart: ChartDataPoint[]
  compare: DashboardCompare | null
  expenseChart: ExpenseChartDataPoint[]
  deletedStores: DeletedStore[]
  newlyAddedStores: NewlyAddedStore[]
  collectionStatus: CollectionStatus
}

// API 응답 타입
interface DashboardResponse {
  data: DashboardData
}

// 조회 기간 타입
export type DashboardPeriod = "daily" | "monthly"

// 비교 기간 타입 (prevMonth는 일별 모드 전용)
export type DashboardCompareMode = "none" | "prevMonth" | "prevYear"

// 쿼리 키
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 관리자 대시보드 데이터 조회 훅
 *
 * @param period - 조회 기간 (daily: 일별, monthly: 월별)
 * @param year - 조회 연도
 * @param month - 조회 월 (daily 모드에서만 사용)
 * @param compare - 비교 기간 (none / prevMonth / prevYear)
 */
export function useDashboard(
  period: DashboardPeriod,
  year: number,
  month?: number,
  compare: DashboardCompareMode = "none",
) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, { period, year, month, compare }],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        year: String(year),
      })
      if (month !== undefined) {
        params.set("month", String(month))
      }
      if (compare !== "none") {
        params.set("compare", compare)
      }
      const response = await apiClient<DashboardResponse>(
        `/api/admin/dashboard?${params.toString()}`
      )
      return response.data
    },
  })
}
