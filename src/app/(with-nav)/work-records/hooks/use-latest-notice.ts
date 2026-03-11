import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface LatestNotice {
  id: string
  title: string
  content: string
  createdAt: string
  author: { name: string }
}

/**
 * 최신 공지 1건 조회 훅
 * staleTime을 길게 설정 (10분) — 공지는 자주 바뀌지 않음
 */
export function useLatestNotice() {
  return useQuery({
    queryKey: ["notices", "latest"],
    queryFn: async () => {
      const response = await apiClient<{ data: LatestNotice | null }>(
        "/api/notices/latest"
      )
      return response.data
    },
    staleTime: 10 * 60 * 1000,
  })
}
