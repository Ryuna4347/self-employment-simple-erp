import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

export interface StoreUncollectedRecord {
  id: string
  date: string
  items: { name: string; amount: number; quantity: number }[]
  totalAmount: number
  // PENDING 상태의 CollectionRequest에 묶여 있으면 그 id, 아니면 null
  pendingRequestId: string | null
}

export const STORE_UNCOLLECTED_KEY = ["store-uncollected"] as const

export function useStoreUncollected(storeId: string | null | undefined) {
  return useQuery({
    queryKey: [...STORE_UNCOLLECTED_KEY, storeId],
    queryFn: async () => {
      const response = await apiClient<ApiResponse<StoreUncollectedRecord[]>>(
        `/api/work-records/store-uncollected?storeId=${storeId}`
      )
      return response.data
    },
    enabled: !!storeId,
    staleTime: 0,
  })
}
