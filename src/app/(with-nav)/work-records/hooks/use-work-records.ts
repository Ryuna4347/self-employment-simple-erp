import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { STORE_VISITS_KEY } from "./use-store-visits"
import type { PaymentType } from "@/generated/prisma/client"

export type CollectionStatus = "UNCOLLECTED" | "COLLECTED" | "CLOSED"

// 근무기록 생성 입력 타입
export interface WorkRecordInput {
  date: string // YYYY-MM-DD
  storeId?: string // 매장 검색 선택 시 (optional)
  storeName: string // 매장명 (필수)
  storeAddress?: string // 주소 (선택)
  paymentType: PaymentType // 결제방식 (필수)
  managerName?: string // 담당자 (선택)
  collectionStatus: CollectionStatus
  imageUrl?: string
  note?: string
  items: {
    name: string
    amount: number
    quantity: number
  }[]
}

// 근무기록 수정 입력 타입
export interface WorkRecordUpdateInput {
  collectionStatus?: CollectionStatus
  imageUrl?: string | null
  note?: string
  items?: {
    name: string
    amount: number
    quantity: number
  }[]
}

export interface WorkRecordItem {
  id: string
  name: string
  amount: number
  quantity: number
}

export interface WorkRecordStore {
  id: string
  name: string
  address: string
  managerName: string | null
}

export interface WorkRecordUser {
  id: string
  name: string
}

export interface StoreOutstanding {
  count: number
  totalAmount: number
}

export interface WorkRecordResponse {
  id: string
  date: string
  storeId: string | null // nullable (직접 입력 시 null)
  userId: string
  collectionStatus: CollectionStatus
  imageUrl: string | null
  note: string | null
  // 스냅샷 필드
  storeNameSnapshot: string | null
  storeAddressSnapshot: string | null
  managerNameSnapshot: string | null
  paymentTypeSnapshot: PaymentType
  store: WorkRecordStore | null // nullable (직접 입력 시 null)
  items: WorkRecordItem[]
  user: WorkRecordUser
  // 수금 추적 정보
  collectedAt: string | null
  collectedBy: WorkRecordUser | null
  // 해당 매장의 다른 날짜 미수 집계 (현재 날짜 제외)
  storeOutstanding?: StoreOutstanding | null
  // 수금 확인 요청 관련
  canDirectCollect?: boolean
  hasPendingRequest?: boolean
  hasPreviousUncollected?: boolean
}

// 일별 통계 (서버에서 계산)
export interface WorkRecordsSummary {
  totalVisits: number
  totalSales: number
  collectedSales: number
  uncollectedSales: number
  collectedByPaymentType: Record<PaymentType, number>
}

// 페이지네이션 정보
interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

// API 응답 타입
interface WorkRecordsApiResponse {
  data: {
    records: WorkRecordResponse[]
    summary: WorkRecordsSummary
    pagination: PaginationInfo
  }
}

export const WORK_RECORDS_KEY = ["work-records"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

export const WORK_RECORDS_LIMIT = 100

export function useWorkRecords(date: string, userId?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: [...WORK_RECORDS_KEY, { date, userId, search }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ date })
      if (userId) params.set("userId", userId)
      if (search) params.set("search", search)
      params.set("page", String(pageParam))
      params.set("limit", String(WORK_RECORDS_LIMIT))
      const response = await apiClient<WorkRecordsApiResponse>(`/api/work-records?${params.toString()}`)
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    enabled: !!date,
  })
}

// 근무기록 생성 훅
export function useCreateWorkRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: WorkRecordInput) => {
      const response = await apiClient<{ data: WorkRecordResponse }>("/api/work-records", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: [...STORE_VISITS_KEY] })
    },
  })
}

// 근무기록 수정 훅
export function useUpdateWorkRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: WorkRecordUpdateInput & { id: string }) => {
      const response = await apiClient<{ data: WorkRecordResponse }>(`/api/work-records/${id}`, {
        method: "PUT",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: [...STORE_VISITS_KEY] })
    },
  })
}

// 근무기록 삭제 훅
export function useDeleteWorkRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/api/work-records/${id}`, { method: "DELETE" })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: [...STORE_VISITS_KEY] })
    },
  })
}

// 직접 입력한 매장을 Store DB에 저장하는 훅
export function useSaveStoreFromWorkRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workRecordId: string) => {
      const response = await apiClient<{
        data: { store: unknown; workRecord: WorkRecordResponse }
      }>(`/api/work-records/${workRecordId}/save-store`, {
        method: "POST",
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: ["stores"] })
    },
  })
}
