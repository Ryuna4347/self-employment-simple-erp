import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PaymentType } from "@/generated/prisma/client"

// 미수금 레코드 타입
export interface OutstandingRecord {
  id: string
  date: string
  storeNameSnapshot: string | null
  storeAddressSnapshot: string | null
  managerNameSnapshot: string | null
  paymentTypeSnapshot: PaymentType
  isCollected: boolean
  totalAmount: number
  userName: string
}

// 페이지네이션 정보
interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
  unit: "record" | "store"
}

// API 응답 타입
interface OutstandingResponse {
  data: {
    records: OutstandingRecord[]
    summary: {
      totalOutstanding: number
      count: number
    }
    pagination: PaginationInfo
  }
}

// 필터 파라미터 타입
export type DateFilterParams = {
  filter: "date"
  year: number
  month: number
  page: number
}

export type StoreFilterParams = {
  filter: "store"
  storeName?: string
  page: number
}

export type OutstandingParams = DateFilterParams | StoreFilterParams

// 페이지당 항목 수
export const OUTSTANDING_LIMIT = 20

// 쿼리 키
export const OUTSTANDING_KEY = ["admin", "outstanding"] as const

const WORK_RECORDS_KEY = ["work-records"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 미수금 목록 조회 훅
 *
 * filter에 따라 날짜별(레코드 단위) 또는 매장별(매장 단위) 페이지네이션을 지원한다.
 */
export function useOutstanding(params: OutstandingParams) {
  return useQuery({
    queryKey: [...OUTSTANDING_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set("filter", params.filter)
      searchParams.set("page", String(params.page))
      searchParams.set("limit", String(OUTSTANDING_LIMIT))

      if (params.filter === "date") {
        searchParams.set("year", String(params.year))
        searchParams.set("month", String(params.month))
      } else if (params.storeName) {
        searchParams.set("storeName", params.storeName)
      }

      const response = await apiClient<OutstandingResponse>(
        `/api/admin/outstanding?${searchParams.toString()}`
      )
      return response.data
    },
    placeholderData: keepPreviousData,
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
    mutationFn: async ({ id, isCollected }: { id: string; isCollected: boolean }) => {
      const response = await apiClient<{ data: unknown }>(
        `/api/work-records/${id}`,
        {
          method: "PUT",
          json: { isCollected },
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
    mutationFn: async ({ ids, isCollected }: { ids: string[]; isCollected: boolean }) => {
      const response = await apiClient<{ data: { updatedCount: number } }>(
        `/api/admin/outstanding/batch-collect`,
        {
          method: "POST",
          json: { ids, isCollected },
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
