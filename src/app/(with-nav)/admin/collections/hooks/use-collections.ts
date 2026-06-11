import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse, PaginationInfo } from "@/types/api"
import type { CollectionRequestStatus } from "@/generated/prisma/client"

// 수금 확인 요청 목록 아이템
// 백엔드 매핑: src/app/api/collection-requests/route.ts (GET 응답)
//  - createdAt/reviewedAt: KST "yyyy-MM-dd HH:mm" 포맷 문자열 (서버에서 사전 포맷)
//  - items[].workRecord.date: KST "yyyy-MM-dd" 포맷 문자열 (서버에서 사전 포맷)
//  - items 는 workRecord.date 오름차순 정렬됨
export interface CollectionRequestListItem {
  id: string
  storeNameSnapshot: string
  requesterName: string
  status: CollectionRequestStatus
  recordCount: number
  totalAmount: number
  createdAt: string
  reviewedAt: string | null
  note: string | null
  items: {
    id: string
    workRecordId: string
    workRecord: {
      id: string
      date: string
      storeNameSnapshot: string | null
      items: { id: string; name: string; amount: number; quantity: number }[]
      itemsTotal: number
    }
  }[]
}

// 수금 확인 요청 상세
export interface CollectionRequestDetail {
  id: string
  storeNameSnapshot: string
  status: CollectionRequestStatus
  note: string | null
  createdAt: string
  reviewedAt: string | null
  requester: { id: string; name: string }
  reviewer: { id: string; name: string } | null
  store: { id: string; name: string; address: string } | null
  items: {
    id: string
    workRecord: {
      id: string
      date: string
      storeNameSnapshot: string | null
      storeAddressSnapshot: string | null
      collectionStatus: string
      items: { id: string; name: string; amount: number; quantity: number }[]
      totalAmount: number
    }
  }[]
  totalAmount: number
}

// 수금 이력 아이템
export interface CollectionHistoryItem {
  type: "direct" | "request"
  collectedByName: string
  collectedAt: string
  storeNameSnapshot: string
  totalAmount: number
  workRecord?: {
    id: string
    date: string
    items: { name: string; amount: number; quantity: number }[]
  }
  records?: {
    id: string
    date: string
    totalAmount: number
    items: { name: string; amount: number; quantity: number }[]
  }[]
}

// 수금 확인 요청 목록 조회
export function useCollectionRequests(status: string) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.collectionRequests, { status }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        status,
        page: String(pageParam),
        limit: "20",
      })
      const response = await apiClient<
        ApiResponse<{ requests: CollectionRequestListItem[]; pagination: PaginationInfo }>
      >(`/api/collection-requests?${params.toString()}`)
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })
}

// 수금 확인 요청 상세 조회
export function useCollectionRequestDetail(id: string | null) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.collectionRequests, id],
    queryFn: async () => {
      const response = await apiClient<ApiResponse<CollectionRequestDetail>>(
        `/api/collection-requests/${id}`
      )
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: () => undefined,
    enabled: !!id,
  })
}

// 승인 mutation
export function useApproveCollectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient<ApiResponse<unknown>>(
        `/api/collection-requests/${id}/approve`,
        { method: "POST" }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collectionRequests })
      queryClient.invalidateQueries({ queryKey: queryKeys.collectionHistory })
      queryClient.invalidateQueries({ queryKey: queryKeys.outstanding })
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

// 거부 mutation
export function useRejectCollectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient<ApiResponse<unknown>>(
        `/api/collection-requests/${id}/reject`,
        { method: "POST" }
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collectionRequests })
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords })
    },
  })
}

// 수금 이력 조회
export interface CollectionHistoryParams {
  year: number
  month: number
  userId?: string
  search?: string
}

export function useCollectionHistory(params: CollectionHistoryParams) {
  return useInfiniteQuery({
    queryKey: [...queryKeys.collectionHistory, params],
    queryFn: async ({ pageParam }) => {
      const searchParams = new URLSearchParams({
        year: String(params.year),
        month: String(params.month),
        page: String(pageParam),
        limit: "20",
      })
      if (params.userId) searchParams.set("userId", params.userId)
      if (params.search) searchParams.set("search", params.search)
      const response = await apiClient<
        ApiResponse<{ items: CollectionHistoryItem[]; pagination: PaginationInfo }>
      >(`/api/admin/collection-history?${searchParams.toString()}`)
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })
}
