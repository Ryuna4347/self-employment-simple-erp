import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

// 뮤테이션 입력 타입
interface DailyCostInput {
  date: string
  title: string
  amount: number
}

// 쿼리 키
const DAILY_COST_KEY = ["daily-cost"] as const
const COSTS_KEY = ["admin", "costs"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 특정 날짜의 비용 조회 훅
 * @param title - 비용 타입 (예: "주유비", "차량수리비")
 * @param date - 조회 날짜 (YYYY-MM-DD)
 * @param userId - 조회 대상 유저 ID (어드민이 다른 유저 조회 시)
 */
export function useDailyCost(title: string, date: string, userId?: string) {
  return useQuery({
    queryKey: [...DAILY_COST_KEY, title, { date, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ date, title })
      if (userId) params.set("userId", userId)
      const response = await apiClient<ApiResponse<{ amount: number | null }>>(
        `/api/expenses/daily-cost?${params.toString()}`
      )
      return response.data
    },
    enabled: !!date,
  })
}

/**
 * 비용 입력/수정 훅 (동일 날짜 덮어쓰기)
 */
export function useUpsertDailyCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: DailyCostInput) => {
      return await apiClient("/api/expenses/daily-cost", {
        method: "POST",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DAILY_COST_KEY })
      queryClient.invalidateQueries({ queryKey: COSTS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}
