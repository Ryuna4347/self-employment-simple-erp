import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { WORK_RECORDS_KEY } from "./use-work-records"
import { STORE_UNCOLLECTED_KEY } from "./use-store-uncollected"

const OUTSTANDING_KEY = ["admin", "outstanding"] as const
const DASHBOARD_KEY = ["admin", "dashboard"] as const

interface BatchCollectInput {
  workRecordIds: string[]
}

export function useBatchCollect() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: BatchCollectInput) => {
      const response = await apiClient<{ data: unknown }>("/api/work-records/batch-collect", {
        method: "POST",
        json: data,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WORK_RECORDS_KEY })
      queryClient.invalidateQueries({ queryKey: STORE_UNCOLLECTED_KEY })
      queryClient.invalidateQueries({ queryKey: OUTSTANDING_KEY })
      queryClient.invalidateQueries({ queryKey: DASHBOARD_KEY })
    },
  })
}
