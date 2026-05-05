import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PaymentType, ReceiptType } from "@/generated/prisma/client"

// 매장 품목 타입
export interface StoreItem {
  id: string
  storeId: string
  name: string
  amount: number
  quantity: number
}

// 매장 타입
export interface Store {
  id: string
  name: string
  address: string
  managerName: string | null
  PaymentType: PaymentType
  receiptType: ReceiptType
  kakaoPlaceId: string | null
  latitude: number | null
  longitude: number | null
  assignedUserId: string | null
  note: string | null
  taxInvoiceEnabled: boolean
  taxPartyId: string | null
  taxParty: {
    id: string
    name: string
    bizNo: string
    representativeName: string | null
    businessType: string | null
    businessItem: string | null
    taxInvoiceEmail: string | null
    address: string | null
  } | null
  assignedUser: { id: string; name: string } | null
  storeItems: StoreItem[]
}

// 매장 생성/수정 입력 타입
export interface StoreInput {
  name: string
  address: string
  managerName?: string | null
  PaymentType: PaymentType
  receiptType?: ReceiptType
  kakaoPlaceId?: string | null
  latitude?: number | null
  longitude?: number | null
  assignedUserId?: string | null
  note?: string | null
  taxInvoiceEnabled?: boolean
  taxPartyId?: string | null
  items?: {
    name: string
    amount: number
    quantity: number
  }[]
  templateId?: string | null
}

// API 응답 타입
interface StoresResponse {
  data: Store[]
}

interface StoreResponse {
  data: Store
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

interface StoresPaginatedResponse {
  data: {
    stores: Store[]
    pagination: PaginationInfo
  }
}

// 쿼리 키
const STORES_KEY = ["stores"] as const
const STORE_TEMPLATES_KEY = ["store-templates"] as const

/**
 * 매장 목록 조회 훅
 */
export function useStores(search?: string) {
  return useQuery({
    queryKey: [...STORES_KEY, { search }],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      const response = await apiClient<StoresResponse>(`/api/stores${params}`)
      return response.data
    },
  })
}

// 페이지당 항목 수
export const STORES_LIMIT = 50

/**
 * 매장 목록 조회 훅 (무한 스크롤)
 * @param search - 검색어 (매장명, 주소, 담당자)
 */
export function useStoresInfinite(search?: string) {
  return useInfiniteQuery({
    queryKey: [...STORES_KEY, "infinite", { search }],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      params.set("page", String(pageParam))
      params.set("limit", String(STORES_LIMIT))
      const response = await apiClient<StoresPaginatedResponse>(
        `/api/stores?${params.toString()}`
      )
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  })
}

/**
 * 매장 추가 훅
 */
export function useCreateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: StoreInput) => {
      const response = await apiClient<StoreResponse>("/api/stores", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
      // 코스에 매장이 추가되었으면 코스 캐시도 갱신
      if (variables.templateId) {
        queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
      }
    },
  })
}

/**
 * 매장 수정 훅
 */
export function useUpdateStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: StoreInput & { id: string }) => {
      const response = await apiClient<StoreResponse>(`/api/stores/${id}`, {
        method: "PUT",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
      // 매장 정보 변경 시 스냅샷 연동으로 인한 캐시 무효화
      queryClient.invalidateQueries({ queryKey: ["work-records"] })
      queryClient.invalidateQueries({ queryKey: ["admin"] })
    },
  })
}

/**
 * 매장 삭제 훅
 */
export function useDeleteStore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/api/stores/${id}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
      // 삭제된 매장이 코스에서 사라지므로 캐시 무효화
      queryClient.invalidateQueries({ queryKey: STORE_TEMPLATES_KEY })
    },
  })
}
