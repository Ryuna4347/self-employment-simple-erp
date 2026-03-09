import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 응답 타입
interface FuelCostResponse {
  data: {
    amount: number | null
  }
}

// 뮤테이션 입력 타입
interface FuelCostInput {
  date: string
  amount: number
}

// 쿼리 키
const FUEL_COST_KEY = ["fuel-cost"] as const
const COSTS_KEY = ["admin", "costs"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 특정 날짜의 주유비 조회 훅
 * @param userId - 조회 대상 유저 ID (어드민이 다른 유저 조회 시)
 */
export function useFuelCost(date: string, userId?: string) {
  return useQuery({
    queryKey: [...FUEL_COST_KEY, { date, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ date })
      if (userId) params.set("userId", userId)
      const response = await apiClient<FuelCostResponse>(
        `/api/expenses/fuel-cost?${params.toString()}`
      )
      return response.data
    },
    enabled: !!date,
  })
}

/**
 * 주유비 입력/수정 훅 (동일 날짜 덮어쓰기)
 */
export function useUpsertFuelCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: FuelCostInput) => {
      return await apiClient("/api/expenses/fuel-cost", {
        method: "POST",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FUEL_COST_KEY })
      queryClient.invalidateQueries({ queryKey: COSTS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}
