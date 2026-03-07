import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface StoreUncollectedRecord {
  id: string
  date: string
  items: { id: string; name: string; amount: number; quantity: number }[]
  totalAmount: number
}

interface StoreUncollectedResponse {
  data: StoreUncollectedRecord[]
}

export const STORE_UNCOLLECTED_KEY = ["store-uncollected"] as const

export function useStoreUncollected(storeId: string | null | undefined) {
  return useQuery({
    queryKey: [...STORE_UNCOLLECTED_KEY, storeId],
    queryFn: async () => {
      const response = await apiClient<StoreUncollectedResponse>(
        `/api/work-records/store-uncollected?storeId=${storeId}`
      )
      return response.data
    },
    enabled: !!storeId,
    staleTime: 0,
  })
}
