import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

// 고정비용 레코드 타입
export interface RecurringCostRecord {
  id: string
  name: string
  amount: number
  frequency: "WEEKLY" | "MONTHLY"
  isActive: boolean
}

// 고정비용 생성/수정 입력 타입
export interface RecurringCostInput {
  name: string
  amount: number
  frequency: "WEEKLY" | "MONTHLY"
}

// 쿼리 키
const RECURRING_COSTS_KEY = ["admin", "recurring-costs"] as const

/**
 * 고정비용 목록 조회 훅
 */
export function useRecurringCosts() {
  return useQuery({
    queryKey: [...RECURRING_COSTS_KEY],
    queryFn: async () => {
      const response = await apiClient<ApiResponse<RecurringCostRecord[]>>(
        "/api/admin/recurring-costs"
      )
      return response.data
    },
  })
}

/**
 * 고정비용 생성 훅
 */
export function useCreateRecurringCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: RecurringCostInput) => {
      return await apiClient("/api/admin/recurring-costs", {
        method: "POST",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_KEY })
    },
  })
}

/**
 * 고정비용 수정 훅
 */
export function useUpdateRecurringCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: RecurringCostInput & { id: string }) => {
      return await apiClient(`/api/admin/recurring-costs/${id}`, {
        method: "PUT",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_KEY })
    },
  })
}

/**
 * 고정비용 삭제 훅
 */
export function useDeleteRecurringCost() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient(`/api/admin/recurring-costs/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_COSTS_KEY })
    },
  })
}
