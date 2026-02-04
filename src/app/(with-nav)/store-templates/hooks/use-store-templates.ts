import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 멤버 내 매장 정보
interface MemberStore {
  id: string
  name: string
  address: string
}

// 템플릿 멤버 타입
export interface StoreTemplateMember {
  id: string
  templateId: string
  storeId: string
  order: number
  store: MemberStore
}

// 템플릿 타입
export interface StoreTemplate {
  id: string
  name: string
  description: string | null
  userId: string
  memberCount: number
  members: StoreTemplateMember[]
}

// 템플릿 생성/수정 입력 타입
export interface StoreTemplateInput {
  name: string
  description?: string
  members: {
    storeId: string
    order: number
  }[]
}

// 템플릿 적용 결과 타입
export interface ApplyTemplateResult {
  created: number
  skipped: number
  workRecords: Array<{
    id: string
    storeId: string
    store: { id: string; name: string; address: string }
  }>
}

// API 응답 타입
interface StoreTemplatesResponse {
  success: boolean
  data: StoreTemplate[]
}

interface StoreTemplateResponse {
  success: boolean
  data: StoreTemplate
}

interface ApplyTemplateResponse {
  success: boolean
  data: ApplyTemplateResult
}

// 쿼리 키
const STORE_TEMPLATES_KEY = ["store-templates"] as const
const WORK_RECORDS_KEY = ["work-records"] as const

/**
 * 템플릿 목록 조회 훅
 */
export function useStoreTemplates() {
  return useQuery({
    queryKey: STORE_TEMPLATES_KEY,
    queryFn: async () => {
      const response = await apiClient<StoreTemplatesResponse>("/api/store-templates")
      return response.data
    },
  })
}

/**
 * 템플릿 생성 훅
 */
export function useCreateStoreTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: StoreTemplateInput) => {
      const response = await apiClient<StoreTemplateResponse>("/api/store-templates", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
    },
  })
}

/**
 * 템플릿 수정 훅
 */
export function useUpdateStoreTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: StoreTemplateInput & { id: string }) => {
      const response = await apiClient<StoreTemplateResponse>(`/api/store-templates/${id}`, {
        method: "PUT",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
    },
  })
}

/**
 * 템플릿 삭제 훅
 */
export function useDeleteStoreTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/api/store-templates/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
    },
  })
}

/**
 * 템플릿 적용 훅 (WorkRecord 일괄 생성)
 */
export function useApplyStoreTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string }) => {
      const response = await apiClient<ApplyTemplateResponse>(
        `/api/store-templates/${id}/apply`,
        {
          method: "POST",
          json: { date },
        }
      )
      return response.data
    },
    onSuccess: () => {
      // WorkRecord 목록도 갱신
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
    },
  })
}
