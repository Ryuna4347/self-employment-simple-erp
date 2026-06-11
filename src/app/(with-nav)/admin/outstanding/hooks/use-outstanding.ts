import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse, PaginationInfo } from "@/types/api"
import type { PaymentType } from "@/generated/prisma/client"
import type { CollectionStatus } from "@/app/(with-nav)/work-records/hooks/use-work-records"

// 미수금 레코드 타입
export interface OutstandingRecord {
  id: string
  date: string
  storeId: string | null
  storeNameSnapshot: string | null
  storeAddressSnapshot: string | null
  managerNameSnapshot: string | null
  paymentTypeSnapshot: PaymentType
  collectionStatus: CollectionStatus
  totalAmount: number
  userName: string
  collectedAt: string | null
  collectedByName: string | null
}

// outstanding 전용 페이지네이션: 단위(레코드/매장) 필드가 추가된다
interface OutstandingPagination extends PaginationInfo {
  unit: "record" | "store"
}

// API 응답 페이로드
interface OutstandingPayload {
  records: OutstandingRecord[]
  summary: {
    totalOutstanding: number
    count: number
  }
  pagination: OutstandingPagination
}

// 필터 파라미터 타입 (page 제거 - useInfiniteQuery가 관리)
export type DateFilterParams = {
  filter: "date"
  year: number
  month: number
  userId?: string
  search?: string
}

export type StoreFilterParams = {
  filter: "store"
  storeName?: string
  userId?: string
  agedOnly?: boolean
}

export type OutstandingParams = DateFilterParams | StoreFilterParams

// 페이지당 항목 수
export const OUTSTANDING_LIMIT = 100

// 쿼리 키
export const OUTSTANDING_KEY = ["admin", "outstanding"] as const

const WORK_RECORDS_KEY = ["work-records"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 미수금 목록 조회 훅 (무한 스크롤)
 *
 * filter에 따라 날짜별(레코드 단위) 또는 매장별(매장 단위) 페이지네이션을 지원한다.
 */
export function useOutstanding(params: OutstandingParams) {
  return useInfiniteQuery({
    queryKey: [...OUTSTANDING_KEY, params],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams()
      searchParams.set("filter", params.filter)
      searchParams.set("page", String(pageParam))
      searchParams.set("limit", String(OUTSTANDING_LIMIT))

      if (params.filter === "date") {
        searchParams.set("year", String(params.year))
        searchParams.set("month", String(params.month))
        if (params.search) {
          searchParams.set("search", params.search)
        }
      } else {
        if (params.storeName) {
          searchParams.set("storeName", params.storeName)
        }
        if (params.agedOnly) {
          searchParams.set("agedOnly", "true")
        }
      }

      if (params.userId) {
        searchParams.set("userId", params.userId)
      }

      const response = await apiClient<ApiResponse<OutstandingPayload>>(
        `/api/admin/outstanding?${searchParams.toString()}`
      )
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })
}

/**
 * 장기 미수(2개월 이상) 매장 수만 경량 조회
 *
 * 알림 배너의 표시 여부를 결정하는 용도.
 * limit=1로 호출하여 페이지 레코드 부하를 최소화한다.
 */
export function useAgedOutstandingCount() {
  return useQuery({
    queryKey: [...OUTSTANDING_KEY, "aged-count"] as const,
    queryFn: async () => {
      const response = await apiClient<ApiResponse<{ pagination: { totalCount: number } }>>(
        `/api/admin/outstanding?filter=store&agedOnly=true&page=1&limit=1`
      )
      return response.data.pagination.totalCount
    },
    staleTime: 30_000,
  })
}

/**
 * 수금 상태 토글 훅
 *
 * 미수금 목록에서 수금 완료/미완료를 토글합니다.
 * 현재 페이지에서는 toggledItems Map으로 즉시 반영되고,
 * outstanding 캐시도 백그라운드에서 무효화하여 필터 전환 시 최신 데이터를 보장한다.
 */
export function useToggleCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, collectionStatus }: { id: string; collectionStatus: CollectionStatus }) => {
      const response = await apiClient<ApiResponse<unknown>>(
        `/api/work-records/${id}`,
        {
          method: "PUT",
          json: { collectionStatus },
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: OUTSTANDING_KEY })
    },
  })
}

/**
 * 일괄 수금 상태 토글 훅
 *
 * 매장별 보기에서 여러 레코드의 수금 상태를 한 번에 변경합니다.
 */
export function useBatchToggleCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ids, collectionStatus }: { ids: string[]; collectionStatus: CollectionStatus }) => {
      const response = await apiClient<ApiResponse<{ updatedCount: number }>>(
        `/api/admin/outstanding/batch-collect`,
        {
          method: "POST",
          json: { ids, collectionStatus },
        }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
      queryClient.invalidateQueries({ queryKey: OUTSTANDING_KEY })
    },
  })
}
