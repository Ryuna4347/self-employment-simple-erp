import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 물품 타입
export interface SaleItem {
  id: string
  name: string
  unitPrice: number
}

// API 응답 타입
interface SaleItemsResponse {
  success: boolean
  data: SaleItem[]
}

interface SaleItemResponse {
  success: boolean
  data: SaleItem
}

// 쿼리 키
const SALE_ITEMS_KEY = ["sale-items"] as const

/**
 * 물품 목록 조회 훅
 */
export function useSaleItems(
  search?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...SALE_ITEMS_KEY, { search }],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      const response = await apiClient<SaleItemsResponse>(
        `/api/sale-items${params}`
      )
      return response.data
    },
    enabled: options?.enabled,
  })
}

/**
 * 물품 추가 훅
 */
export function useCreateSaleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; unitPrice: number }) => {
      const response = await apiClient<SaleItemResponse>("/api/sale-items", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALE_ITEMS_KEY })
    },
  })
}

/**
 * 물품 수정 훅
 */
export function useUpdateSaleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string
      name?: string
      unitPrice?: number
    }) => {
      const response = await apiClient<SaleItemResponse>(
        `/api/sale-items/${id}`,
        {
          method: "PATCH",
          json: data,
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALE_ITEMS_KEY })
    },
  })
}

/**
 * 물품 삭제 훅
 */
export function useDeleteSaleItem() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/api/sale-items/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALE_ITEMS_KEY })
    },
  })
}
