import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { ApiResponse } from "@/types/api"

interface CreateCollectionRequestInput {
  storeId?: string | null
  storeNameSnapshot: string
  workRecordIds: string[]
  note?: string
}

export function useCreateCollectionRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCollectionRequestInput) => {
      const response = await apiClient<ApiResponse<unknown>>("/api/collection-requests", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workRecords })
      queryClient.invalidateQueries({ queryKey: queryKeys.storeUncollected })
    },
  })
}
