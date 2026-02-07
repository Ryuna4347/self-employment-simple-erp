import { useMutation } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

interface ChangePasswordResponse {
  success: boolean
  message: string
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      return apiClient<ChangePasswordResponse>("/api/profile/password", {
        method: "PATCH",
        json: data,
      })
    },
  })
}
