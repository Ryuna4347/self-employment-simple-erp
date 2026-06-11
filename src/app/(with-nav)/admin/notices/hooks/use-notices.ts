import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

// 공지 레코드 타입
export interface NoticeRecord {
  id: string
  title: string
  content: string
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  authorId: string
  author: { name: string }
}

// 공지 생성/수정 입력 타입
export interface NoticeInput {
  title: string
  content: string
  expiresAt: string | null
}

// 쿼리 키
const NOTICES_KEY = ["admin", "notices"] as const
const LATEST_NOTICE_KEY = ["notices", "latest"] as const

/**
 * 공지 목록 조회 훅 (어드민)
 */
export function useNotices() {
  return useQuery({
    queryKey: [...NOTICES_KEY],
    queryFn: async () => {
      const response = await apiClient<ApiResponse<NoticeRecord[]>>(
        "/api/admin/notices"
      )
      return response.data
    },
  })
}

/**
 * 공지 생성 훅
 */
export function useCreateNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: NoticeInput) => {
      return await apiClient("/api/admin/notices", {
        method: "POST",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
      queryClient.invalidateQueries({ queryKey: LATEST_NOTICE_KEY })
    },
  })
}

/**
 * 공지 수정 훅
 */
export function useUpdateNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: NoticeInput & { id: string }) => {
      return await apiClient(`/api/admin/notices/${id}`, {
        method: "PUT",
        json: data,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
      queryClient.invalidateQueries({ queryKey: LATEST_NOTICE_KEY })
    },
  })
}

/**
 * 공지 삭제 훅
 */
export function useDeleteNotice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiClient(`/api/admin/notices/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTICES_KEY })
      queryClient.invalidateQueries({ queryKey: LATEST_NOTICE_KEY })
    },
  })
}
