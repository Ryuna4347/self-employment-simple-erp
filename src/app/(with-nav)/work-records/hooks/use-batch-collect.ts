import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse } from "@/types/api"

interface BatchCollectInput {
  workRecordIds: string[]
}

// 백엔드 응답 shape (03_backend_changes.md 기준)
interface BatchCollectResult {
  updatedCount: number
  accumulatedAmount: number
  // 자동 종결된 PENDING CollectionRequest id 배열 (없으면 [])
  approvedRequestIds: string[]
}

export function useBatchCollect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BatchCollectInput) => {
      const response = await apiClient<ApiResponse<BatchCollectResult>>(
        "/api/work-records/batch-collect",
        {
          method: "POST",
          json: data,
        }
      )
      return response.data
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeUncollected })
      queryClient.invalidateQueries({ queryKey: queryKeys.outstanding })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      // 어드민 batch-collect가 PENDING CollectionRequest를 자동 APPROVED로 종결하므로
      // /admin/collections 페이지(요청 목록 + 이력)도 함께 무효화해야 한다
      // (단순화를 위해 무조건 무효화해도 무방하나, 응답에 종결 ID가 노출되므로 조건부 처리)
      if (result?.approvedRequestIds && result.approvedRequestIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: queryKeys.collectionRequests })
        queryClient.invalidateQueries({ queryKey: queryKeys.collectionHistory })
      }
    },
  })
}
