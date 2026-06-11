import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      return apiClient<ApiResponse<unknown>>("/api/profile/password", {
        method: "PATCH",
        json: data,
      })
    },
  })
}
