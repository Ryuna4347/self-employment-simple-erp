import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { WORK_RECORDS_KEY } from "./use-work-records"
import { STORE_UNCOLLECTED_KEY } from "./use-store-uncollected"

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
      const response = await apiClient<{ data: unknown }>("/api/collection-requests", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: STORE_UNCOLLECTED_KEY })
    },
  })
}
