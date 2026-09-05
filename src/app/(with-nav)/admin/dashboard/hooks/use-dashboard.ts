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
  // 전월 같은 일자의 매출. 월별 모드 또는 전월에 없는 날짜면 null
  compareRevenue: number | null
  // 전월 같은 일자 라벨 "MM/DD" (툴팁 표기용). compareRevenue가 null이면 null
  compareLabel: string | null
}

// 전월이 당월보다 긴 달일 때(예: 9월 조회 ↔ 8월 31일) 당월에 없는 일자의 전월 매출.
// 누적 매출 차트 가로축을 일수가 많은 달에 맞추는 용도. 그 외에는 빈 배열
export interface CompareTailPoint {
  // 당월에 없는 날이라 "MM/DD"가 아닌 일자 번호("31")
  label: string
  compareRevenue: number
  compareLabel: string | null
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
  compareTail: CompareTailPoint[]
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

// 쿼리 키
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 관리자 대시보드 데이터 조회 훅
 *
 * 일별 모드에서는 API가 매출 차트용 전월 값(chart[].compareRevenue/compareLabel)을 항상 함께 반환한다.
 * 전월이 당월보다 긴 달이면 당월에 없는 일자의 전월 매출을 compareTail[]로 덧붙인다.
 *
 * @param period - 조회 기간 (daily: 일별, monthly: 월별)
 * @param year - 조회 연도
 * @param month - 조회 월 (daily 모드에서만 사용)
 */
export function useDashboard(period: DashboardPeriod, year: number, month?: number) {
  return useQuery({
    queryKey: [...DASHBOARD_KEY, { period, year, month }],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        year: String(year),
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
