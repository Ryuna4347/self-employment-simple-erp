import { queryOptions, useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface UserOption {
  id: string
  name: string
  loginId: string
  role: "ADMIN" | "USER"
}

interface ApiResponse {
  data: UserOption[]
}

export const USERS_KEY = ["users"] as const

// 직원 목록은 거의 바뀌지 않으므로 페이지를 옮겨 다닐 때마다 다시 받지 않도록 5분간 신선하게 유지한다
// (직원 삭제 시에는 useDeleteStaff가 이 키를 무효화한다)
const USERS_STALE_TIME = 5 * 60 * 1000

/**
 * 직원(사용자) 목록 쿼리 옵션 (useUsers와 prefetchQuery에서 공용)
 */
export function usersQueryOptions() {
  return queryOptions({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const response = await apiClient<ApiResponse>("/api/users")
      return response.data
    },
    staleTime: USERS_STALE_TIME,
  })
}

export function useUsers(enabled: boolean = true) {
  return useQuery({
    ...usersQueryOptions(),
    enabled,
  })
}
