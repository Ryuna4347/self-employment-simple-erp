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
interface ChartDataPoint {
  label: string
  revenue: number
  cash: number
  account: number
  card: number
  // 비교 구간의 같은 날/월 매출. 대응되는 날이 없으면 null
  compareRevenue: number | null
}

// 비교 구간 정보 (비교 안 함이면 null)
export interface CompareRange {
  label: string
  from: string
  to: string
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

// 대시보드 데이터
export interface DashboardData {
  summary: DashboardSummary
  chart: ChartDataPoint[]
  compare: CompareRange | null
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

// 매출 그래프 비교 기준
export type DashboardCompare = "none" | "prevMonth" | "prevYear"

// 쿼리 키
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 관리자 대시보드 데이터 조회 훅
 *
 * @param period - 조회 기간 (daily: 일별, monthly: 월별)
 * @param year - 조회 연도
 * @param month - 조회 월 (daily 모드에서만 사용)
 * @param compare - 매출 그래프 비교 기준 (none: 비교 없음)
 */
export function useDashboard(
  period: DashboardPeriod,
  year: number,
  month?: number,
  compare: DashboardCompare = "none"
) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, { period, year, month, compare }],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        year: String(year),
        compare,
      })
      if (month !== undefined) {
        params.set("month", String(month))
      }
      const response = await apiClient<DashboardResponse>(
        `/api/admin/dashboard?${params.toString()}`
      )
      return response.data
    },
  })
}
