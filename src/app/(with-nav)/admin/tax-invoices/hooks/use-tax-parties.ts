import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export interface TaxParty {
  id: string
  name: string
  bizNo: string
  representativeName: string | null
  businessType: string | null
  businessItem: string | null
  taxInvoiceEmail: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface TaxPartyInput {
  name: string
  bizNo: string
  representativeName?: string | null
  businessType?: string | null
  businessItem?: string | null
  taxInvoiceEmail?: string | null
  address?: string | null
}

interface TaxPartiesResponse {
  data: {
    parties: TaxParty[]
  }
}

interface TaxPartyResponse {
  data: {
    party: TaxParty
  }
}

interface DeleteTaxPartyResponse {
  data: {
    deleted: boolean
  }
}

const TAX_PARTIES_KEY = ["admin", "tax-parties"] as const
const STORES_KEY = ["stores"] as const

export function useTaxParties(search?: string) {
  return useQuery({
    queryKey: [...TAX_PARTIES_KEY, { search }],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ""
      const response = await apiClient<TaxPartiesResponse>(`/api/admin/tax-parties${params}`)
      return response.data.parties
    },
  })
}

export function useCreateTaxParty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: TaxPartyInput) => {
      const response = await apiClient<TaxPartyResponse>("/api/admin/tax-parties", {
        method: "POST",
        json: data,
      })
      return response.data.party
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_PARTIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
    },
  })
}

export function useUpdateTaxParty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...data }: TaxPartyInput & { id: string }) => {
      const response = await apiClient<TaxPartyResponse>(`/api/admin/tax-parties/${id}`, {
        method: "PUT",
        json: data,
      })
      return response.data.party
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_PARTIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
    },
  })
}

export function useDeleteTaxParty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient<DeleteTaxPartyResponse>(
        `/api/admin/tax-parties/${id}`,
        { method: "DELETE" }
      )
      return response.data.deleted
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAX_PARTIES_KEY })
      queryClient.invalidateQueries({ queryKey: STORES_KEY })
    },
  })
}
