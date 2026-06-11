import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse } from "@/types/api"

export interface UserOption {
  id: string
  name: string
  loginId: string
  role: "ADMIN" | "USER"
}

export function useUsers(enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const response = await apiClient<ApiResponse<UserOption[]>>("/api/users")
      return response.data
    },
    enabled,
  })
}
