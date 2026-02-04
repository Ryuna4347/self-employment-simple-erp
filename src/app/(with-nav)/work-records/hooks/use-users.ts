import { useQuery } from "@tanstack/react-query"
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

const USERS_KEY = ["users"] as const

export function useUsers(enabled: boolean = true) {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const response = await apiClient<ApiResponse>("/api/users")
      return response.data
    },
    enabled,
  })
}
