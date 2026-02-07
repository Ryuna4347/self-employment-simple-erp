import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 대시보드 요약 통계
interface DashboardSummary {
  totalRevenue: number
  outstandingAmount: number
  totalVisits: number
  uniqueStores: number
}

// 차트 데이터 포인트
interface ChartDataPoint {
  label: string
  revenue: number
}

// 매출 상위 매장
interface TopStore {
  name: string
  amount: number
}

// 최근 미수금
interface RecentOutstanding {
  id: string
  date: string
  storeName: string
  totalAmount: number
}

// 수금 현황
interface CollectionStatus {
  collected: number
  uncollected: number
}

// 대시보드 데이터
export interface DashboardData {
  summary: DashboardSummary
  chart: ChartDataPoint[]
  topStores: TopStore[]
  recentOutstanding: RecentOutstanding[]
  collectionStatus: CollectionStatus
}

// API 응답 타입
interface DashboardResponse {
  success: boolean
  data: DashboardData
}

// 조회 기간 타입
export type DashboardPeriod = "daily" | "monthly"

// 쿼리 키
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 관리자 대시보드 데이터 조회 훅
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
