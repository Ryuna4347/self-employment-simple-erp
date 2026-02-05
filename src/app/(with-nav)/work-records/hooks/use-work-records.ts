import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PaymentType } from "@/generated/prisma/client"

// 근무기록 생성 입력 타입
export interface WorkRecordInput {
  date: string // YYYY-MM-DD
  storeId?: string // 매장 검색 선택 시 (optional)
  storeName: string // 매장명 (필수)
  storeAddress?: string // 주소 (선택)
  paymentType: PaymentType // 결제방식 (필수)
  managerName?: string // 담당자 (선택)
  isCollected: boolean
  note?: string
  items: {
    name: string
    unitPrice: number
    quantity: number
  }[]
}

// 근무기록 수정 입력 타입
export interface WorkRecordUpdateInput {
  isCollected?: boolean
  note?: string
  items?: {
    name: string
    unitPrice: number
    quantity: number
  }[]
}

export interface WorkRecordItem {
  id: string
  name: string
  unitPrice: number
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

export interface WorkRecordResponse {
  id: string
  date: string
  storeId: string | null // nullable (직접 입력 시 null)
  userId: string
  isCollected: boolean
  note: string | null
  // 스냅샷 필드
  storeNameSnapshot: string | null
  storeAddressSnapshot: string | null
  managerNameSnapshot: string | null
  paymentTypeSnapshot: PaymentType
  store: WorkRecordStore | null // nullable (직접 입력 시 null)
  items: WorkRecordItem[]
  user: WorkRecordUser
}

interface ApiResponse {
  data: WorkRecordResponse[]
}

const WORK_RECORDS_KEY = ["work-records"] as const

export function useWorkRecords(date: string, userId?: string) {
  return useQuery({
    queryKey: [...WORK_RECORDS_KEY, { date, userId }],
    queryFn: async () => {
      const params = new URLSearchParams({ date })
      if (userId) params.set("userId", userId)
      const response = await apiClient<ApiResponse>(`/api/work-records?${params.toString()}`)
      return response.data
    },
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
