import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { CollectionStatus } from "./use-work-records"

export interface StoreVisit {
  date: string
  collectionStatus: CollectionStatus
}

interface ApiResponse {
  data: StoreVisit[]
}

export interface StoreVisitsOptions {
  /** 조회 기간 (개월, 1~12). 미지정 시 서버 기본 6개월 */
  months?: number
  /** 수금 상태 필터. 미지정 시 휴업&폐업(CLOSED)만 제외 */
  status?: Exclude<CollectionStatus, "CLOSED">
}

/** 근무기록 변경 시 이 접두사로 무효화한다 (조회 옵션별 캐시가 모두 포함됨) */
export const STORE_VISITS_KEY = ["store-visits"] as const

/**
 * 매장 방문 이력 조회 훅 (기본: 최근 6개월, CLOSED 제외)
 */
export function useStoreVisits(
  storeId: string | null,
  enabled: boolean,
  options: StoreVisitsOptions = {}
) {
  const { months, status } = options
  return useQuery({
    queryKey: [...STORE_VISITS_KEY, storeId, { months, status }],
    queryFn: async () => {
      const params = new URLSearchParams({ storeId: storeId! })
      if (months !== undefined) params.set("months", String(months))
      if (status) params.set("status", status)
      const response = await apiClient<ApiResponse>(
        `/api/work-records/store-visits?${params.toString()}`
      )
      return response.data
    },
    enabled: enabled && !!storeId,
  })
}
