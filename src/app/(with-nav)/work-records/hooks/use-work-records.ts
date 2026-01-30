import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { PaymentType } from "@/generated/prisma/client"

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
  storeId: string
  userId: string
  isCollected: boolean
  note: string | null
  paymentTypeSnapshot: PaymentType
  store: WorkRecordStore
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
