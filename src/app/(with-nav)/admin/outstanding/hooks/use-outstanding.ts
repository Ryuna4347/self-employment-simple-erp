import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

// API 응답 타입
interface OutstandingResponse {
  success: boolean
  data: {
    records: OutstandingRecord[]
    summary: {
      totalOutstanding: number
      count: number
    }
  }
}

// 쿼리 키
export const OUTSTANDING_KEY = ["admin", "outstanding"] as const

const WORK_RECORDS_KEY = ["work-records"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

/**
 * 미수금 목록 조회 훅
 *
 * @param year - 조회 연도
 * @param month - 조회 월
 */
export function useOutstanding(year: number, month: number) {
  return useQuery({
    queryKey: [...OUTSTANDING_KEY, { year, month }],
    queryFn: async () => {
      const params = new URLSearchParams({
        year: String(year),
        month: String(month),
      })
      const response = await apiClient<OutstandingResponse>(
        `/api/admin/outstanding?${params.toString()}`
      )
      return response.data
    },
  })
}

/**
 * 수금 상태 토글 훅
 *
 * 미수금 목록에서 수금 완료/미완료를 토글합니다.
 * onSuccess에서 work-records와 dashboard 캐시만 무효화하고,
 * outstanding 캐시는 무효화하지 않아 토글 후에도 목록이 유지됩니다.
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
      // 근무기록 및 대시보드 캐시 무효화
      // outstanding 캐시는 무효화하지 않음 (토글 후 항목이 목록에서 유지되도록)
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}
