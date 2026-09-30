import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PlaceSearchResult } from "@/lib/kakao-local"

export type { PlaceSearchResult }

interface PlaceSearchResponse {
  data: { places: PlaceSearchResult[] }
}

// 검색어 최소 길이 (1글자 검색은 결과가 의미 없고 외부 쿼터만 소모)
export const PLACE_SEARCH_MIN_LENGTH = 2

/**
 * 매장 검색 (상호 → Kakao 장소) 훅
 * @param query 디바운스된 검색어
 * @param excludeStoreId 수정 중인 매장 ID ('이미 등록됨' 표시에서 제외)
 */
export function usePlaceSearch(query: string, excludeStoreId?: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ["place-search", { query: trimmed, excludeStoreId }],
    queryFn: async () => {
      const params = new URLSearchParams({ query: trimmed })
      if (excludeStoreId) params.set("excludeStoreId", excludeStoreId)
      const response = await apiClient<PlaceSearchResponse>(
        `/api/places/search?${params.toString()}`,
      )
      return response.data.places
    },
    enabled: trimmed.length >= PLACE_SEARCH_MIN_LENGTH,
    // 같은 검색어 재요청 방지 (외부 쿼터 절약)
    staleTime: 5 * 60 * 1000,
    // 쿼터 초과/설정 오류는 재시도해도 같은 결과
    retry: false,
  })
}
