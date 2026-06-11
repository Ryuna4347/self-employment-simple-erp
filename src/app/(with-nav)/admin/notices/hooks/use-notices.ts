import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
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

/**
 * 공지 목록 조회 훅 (어드민)
 */
export function useNotices() {
  return useQuery({
    queryKey: queryKeys.adminNotices,
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotices })
      queryClient.invalidateQueries({ queryKey: queryKeys.latestNotice })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotices })
      queryClient.invalidateQueries({ queryKey: queryKeys.latestNotice })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.adminNotices })
      queryClient.invalidateQueries({ queryKey: queryKeys.latestNotice })
    },
  })
}
