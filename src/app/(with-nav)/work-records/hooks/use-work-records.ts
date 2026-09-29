import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { STORE_VISITS_KEY } from "./use-store-visits"
import type { PaymentType } from "@/generated/prisma/client"

export type CollectionStatus = "UNCOLLECTED" | "COLLECTED" | "CLOSED"

// 근무기록 생성 입력 타입
export interface WorkRecordInput {
  date: string // YYYY-MM-DD
  storeId: string
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
  note: string | null
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
  // 이 기록이 PENDING 상태의 CollectionRequest에 직접 묶여 있을 때의 요청 ID (없으면 null)
  pendingRequestId?: string | null
}

// 일별 통계 (서버에서 계산)
export interface WorkRecordsSummary {
  totalVisits: number
  totalSales: number
  collectedSales: number
  uncollectedSales: number
  collectedByPaymentType: Record<PaymentType, number>
  pendingCollectionSales: number
  pendingCollectionByPaymentType: Record<PaymentType, number>
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

// 목록 한 페이지 데이터
interface WorkRecordsPage {
  records: WorkRecordResponse[]
  summary: WorkRecordsSummary
  pagination: PaginationInfo
}

// API 응답 타입
interface WorkRecordsApiResponse {
  data: WorkRecordsPage
}

export const WORK_RECORDS_KEY = ["work-records"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

export const WORK_RECORDS_LIMIT = 100

// 목록 쿼리 키의 조회 범위 (날짜 + 담당자 + 검색어)
interface WorkRecordsScope {
  date: string
  userId?: string
  search?: string
}

/** 근무기록 목록 쿼리 키 (useWorkRecords와 캐시 직접 갱신에서 공용) */
function workRecordsListKey(scope: WorkRecordsScope) {
  return [...WORK_RECORDS_KEY, scope] as const
}

function isWorkRecordsScope(value: unknown): value is WorkRecordsScope {
  return typeof value === "object" && value !== null && "date" in value
}

export function useWorkRecords(date: string, userId?: string, search?: string) {
  return useInfiniteQuery({
    queryKey: workRecordsListKey({ date, userId, search }),
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
    // 같은 날짜·담당자에서 검색어만 바뀐 경우 새 결과가 올 때까지 이전 목록을 유지한다
    // (목록이 "로딩 중..."으로 깜빡이지 않도록. 날짜/담당자가 바뀌면 다른 데이터라 유지하지 않음)
    placeholderData: (previousData, previousQuery) => {
      const previousScope = previousQuery?.queryKey[1]
      const isSameScope =
        isWorkRecordsScope(previousScope) &&
        previousScope.date === date &&
        previousScope.userId === userId
      return isSameScope ? previousData : undefined
    },
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

// 근무기록 일괄 삭제 입력
export interface BulkDeleteInput {
  date: string
  userId?: string
  search?: string
}

// 근무기록 일괄 삭제 응답
export interface BulkDeleteResult {
  deleted: number
  skipped: number
}

// 근무기록 일괄 삭제 훅
export function useBulkDeleteWorkRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: BulkDeleteInput) => {
      const params = new URLSearchParams({ date: input.date })
      if (input.userId) params.set("userId", input.userId)
      if (input.search) params.set("search", input.search)
      const response = await apiClient<{ data: BulkDeleteResult }>(
        `/api/work-records/bulk?${params.toString()}`,
        { method: "DELETE" }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: [...STORE_VISITS_KEY] })
    },
  })
}

// 근무기록 선택 삭제 훅 (ID 배열 기반)
export function useBulkDeleteWorkRecordsByIds() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const response = await apiClient<{ data: BulkDeleteResult }>(
        "/api/work-records/bulk-delete",
        { method: "POST", json: { ids } }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: [...STORE_VISITS_KEY] })
    },
  })
}

// 근무기록 순서 변경 입력
export interface ReorderWorkRecordsInput {
  date: string
  /** 목록 조회 시 사용한 담당자 필터 (캐시 갱신용, 서버로 보내지 않음) */
  userId?: string
  records: { id: string; sortOrder: number }[]
}

/**
 * 캐시된 목록(무한 스크롤 페이지들)을 새 순서로 재배치한다.
 * 페이지별 건수는 그대로 두고, 순서 정보가 없는 기록은 기존 상대 순서를 유지한 채 뒤로 보낸다.
 */
function reorderPages(
  data: InfiniteData<WorkRecordsPage, number>,
  sortOrderById: Map<string, number>
): InfiniteData<WorkRecordsPage, number> {
  const sorted = data.pages
    .flatMap((page) => page.records)
    .map((record, index) => ({
      record,
      order: sortOrderById.get(record.id) ?? sortOrderById.size + index,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ record }) => record)

  let offset = 0
  const pages = data.pages.map((page) => {
    const records = sorted.slice(offset, offset + page.records.length)
    offset += page.records.length
    return { ...page, records }
  })
  return { ...data, pages }
}

// 근무기록 순서 변경 훅
export function useReorderWorkRecords() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ date, records }: ReorderWorkRecordsInput) => {
      await apiClient("/api/work-records/reorder", {
        method: "PATCH",
        json: { date, records },
      })
    },
    onMutate: ({ date, userId, records }) => {
      // 목록 화면은 로컬 상태로 순서를 즉시 반영하므로 캐시도 같은 순서로 맞춰 둔다.
      // (성공 시 재조회 없이도, 다른 날짜에 갔다 오거나 재마운트될 때 이전 순서가 잠깐 보였다가 바뀌지 않도록)
      const sortOrderById = new Map(records.map((r) => [r.id, r.sortOrder]))
      queryClient.setQueryData<InfiniteData<WorkRecordsPage, number>>(
        workRecordsListKey({ date, userId, search: undefined }),
        (old) => (old ? reorderPages(old, sortOrderById) : old)
      )
    },
    onError: () => {
      // 실패 시 서버 상태로 복원
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
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
