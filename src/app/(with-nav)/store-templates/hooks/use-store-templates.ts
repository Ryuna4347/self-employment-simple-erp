import { queryOptions, useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

// 멤버 내 매장 정보
interface MemberStore {
  id: string
  name: string
  address: string
  PaymentType: "CASH" | "ACCOUNT" | "CARD"
  managerName: string | null
  assignedUserId: string | null
}

// 코스 멤버 타입
export interface StoreTemplateMember {
  id: string
  templateId: string
  storeId: string
  order: number
  store: MemberStore
}

// 코스 타입
export interface StoreTemplate {
  id: string
  name: string
  description: string | null
  userId: string
  memberCount: number
  members: StoreTemplateMember[]
}

// 코스 생성/수정 입력 타입
export interface StoreTemplateInput {
  name: string
  description?: string
  members: {
    storeId: string
    order: number
  }[]
}

// 코스 수정 입력 타입 (담당자 이전 포함)
export interface UpdateStoreTemplateInput extends StoreTemplateInput {
  ownerId?: string // 이전할 직원 ID (현재 담당자와 다를 때만 이전)
  transferStores?: boolean // 코스 내 매장 담당자도 함께 이전할지 여부
}

// 코스 수정 결과 타입
export interface UpdateStoreTemplateResult extends StoreTemplate {
  transferredStoreCount: number // 담당자가 이전된 매장 수
}

// 코스 적용 결과 타입
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
  data: StoreTemplate[]
}

// 페이지네이션 API 응답 타입
interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface StoreTemplatesPaginatedResponse {
  data: {
    templates: StoreTemplate[]
    pagination: PaginationInfo
  }
}

interface StoreTemplateResponse {
  data: StoreTemplate
}

interface UpdateStoreTemplateResponse {
  data: UpdateStoreTemplateResult
}

interface ApplyTemplateResponse {
  data: ApplyTemplateResult
}

// 쿼리 키
const STORE_TEMPLATES_KEY = ["store-templates"] as const
const STORES_KEY = ["stores"] as const
const WORK_RECORDS_KEY = ["work-records"] as const

// 모달의 코스 선택 목록(페이지네이션 없음)은 자주 바뀌지 않으므로 1분간 신선하게 유지한다
// (코스 추가/수정/삭제 시에는 STORE_TEMPLATES_KEY 무효화로 갱신)
const STORE_TEMPLATES_LIST_STALE_TIME = 60 * 1000

/**
 * 코스 목록 쿼리 옵션 (useStoreTemplates와 prefetchQuery에서 공용)
 * @param userId - 필터할 사용자 ID (생략 시 서버에서 본인 기본)
 */
export function storeTemplatesQueryOptions(userId?: string) {
  return queryOptions({
    queryKey: [...STORE_TEMPLATES_KEY, { userId }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      const queryString = params.toString()
      const url = queryString
        ? `/api/store-templates?${queryString}`
        : "/api/store-templates"
      const response = await apiClient<StoreTemplatesResponse>(url)
      return response.data
    },
    staleTime: STORE_TEMPLATES_LIST_STALE_TIME,
  })
}

/**
 * 코스 목록 조회 훅
 * @param userId - 필터할 사용자 ID (생략 시 서버에서 본인 기본)
 * @param options.enabled - false면 조회하지 않음 (예: 모달이 닫혀 있을 때)
 */
export function useStoreTemplates(userId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    ...storeTemplatesQueryOptions(userId),
    enabled: options?.enabled ?? true,
  })
}

// 페이지당 항목 수
export const STORE_TEMPLATES_LIMIT = 50

/**
 * 코스 목록 조회 훅 (무한 스크롤)
 * @param userId - 필터할 사용자 ID
 * @param search - 검색어 (코스명, 설명)
 */
export function useStoreTemplatesInfinite(userId?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: [...STORE_TEMPLATES_KEY, "infinite", { userId, search }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (userId) params.set("userId", userId)
      if (search) params.set("search", search)
      params.set("page", String(pageParam))
      params.set("limit", String(STORE_TEMPLATES_LIMIT))
      const response = await apiClient<StoreTemplatesPaginatedResponse>(
        `/api/store-templates?${params.toString()}`
      )
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })
}

/**
 * 코스 생성 훅
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
 * 코스 수정 훅
 */
export function useUpdateStoreTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateStoreTemplateInput & { id: string }) => {
      const response = await apiClient<UpdateStoreTemplateResponse>(
        `/api/store-templates/${id}`,
        {
          method: "PUT",
          json: data,
        }
      )
      return response.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
      // 매장 담당자가 함께 이전된 경우 매장 목록도 갱신
      if (result.transferredStoreCount > 0) {
        queryClient.invalidateQueries({ queryKey: STORES_KEY })
      }
    },
  })
}

/**
 * 코스 삭제 훅
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
 * 코스 적용 훅 (WorkRecord 일괄 생성)
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
