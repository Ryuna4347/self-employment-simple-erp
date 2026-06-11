import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"

export interface EmployeeCashRow {
  userId: string
  name: string
  totalAmount: number
  recordCount: number
  pendingAmount: number
  pendingCount: number
}

export interface DailyCashCollectionData {
  isoDate: string
  dateLabel: string
  rows: EmployeeCashRow[]
  grandTotal: number
}

export function useDailyCashCollection(date: string | null, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["work-records", "daily-cash-collection", date],
    queryFn: async () => {
      if (!date) {
        throw new Error("조회할 날짜가 없습니다")
      }

      const params = new URLSearchParams({ date })
      const response = await apiClient<ApiResponse<DailyCashCollectionData>>(
        `/api/work-records/daily-cash-collection?${params.toString()}`,
        { method: "GET" }
      )
      return response.data
    },
    enabled: !!date && (options?.enabled ?? true),
  })
}
