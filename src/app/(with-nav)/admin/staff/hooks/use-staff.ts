import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

// 직원 목록 타입
export interface StaffMember {
  id: string
  name: string
  loginId: string | null
  role: "ADMIN" | "USER"
  isRegistered: boolean
  createdAt: string
}

// 초대 생성 응답 타입
export interface InviteResult {
  userId: string
  name: string
  inviteCode: string
  inviteUrl: string
}

// 쿼리 키
const STAFF_KEY = ["admin", "staff"] as const

/**
 * 직원 목록 조회 훅
 */
export function useStaff() {
  return useQuery({
    queryKey: [...STAFF_KEY],
    queryFn: async () => {
      const response = await apiClient<ApiResponse<StaffMember[]>>("/api/admin/staff")
      return response.data
    },
  })
}

/**
 * 직원 초대 생성 훅
 */
export function useCreateInvite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiClient<ApiResponse<InviteResult>>(
        "/api/admin/create-invite",
        {
          method: "POST",
          json: data,
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY })
    },
  })
}

/**
 * 직원 삭제 훅
 */
export function useDeleteStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient<ApiResponse<{ id: string }>>(
        `/api/admin/staff/${id}`,
        {
          method: "DELETE",
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_KEY })
    },
  })
}
