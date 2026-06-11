import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"
import type { CollectionStatus } from "./use-work-records"

export interface StoreVisit {
  date: string
  collectionStatus: CollectionStatus
}

export const STORE_VISITS_KEY = ["store-visits"] as const

/**
 * 매장 방문 이력 조회 훅 (최근 6개월, CLOSED 제외)
 */
export function useStoreVisits(storeId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...STORE_VISITS_KEY, storeId],
    queryFn: async () => {
      const params = new URLSearchParams({ storeId: storeId! })
      const response = await apiClient<ApiResponse<StoreVisit[]>>(
        `/api/work-records/store-visits?${params.toString()}`
      )
      return response.data
    },
    enabled: enabled && !!storeId,
  })
}
