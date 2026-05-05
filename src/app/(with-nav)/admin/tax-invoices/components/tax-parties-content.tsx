"use client"

import { useState } from "react"
import { Plus, RefreshCw, Search } from "lucide-react"
import { ErrorView } from "@/components/common/error-view"
import { LoadingView } from "@/components/common/loading-view"
import { useUser } from "@/components/providers/app-providers"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canWrite } from "@/lib/role-utils"
import { TaxPartyCard } from "./tax-party-card"
import { TaxPartyModal } from "./tax-party-modal"
import { DeleteTaxPartyModal } from "./delete-tax-party-modal"
import { useTaxParties, type TaxParty } from "../hooks/use-tax-parties"

export function TaxPartiesContent() {
  const { role } = useUser()
  const writable = canWrite(role)
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [partyModalOpen, setPartyModalOpen] = useState(false)
  const [editingParty, setEditingParty] = useState<TaxParty | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingParty, setDeletingParty] = useState<TaxParty | null>(null)

  const {
    data: parties,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useTaxParties(appliedSearch)

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim())
  }

  const handleEdit = (party: TaxParty) => {
    setEditingParty(party)
    setPartyModalOpen(true)
  }

  const handleDelete = (party: TaxParty) => {
    setDeletingParty(party)
    setDeleteModalOpen(true)
  }

  const handlePartyModalOpenChange = (open: boolean) => {
    if (!open) {
      setEditingParty(null)
    }
    setPartyModalOpen(open)
  }

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (!open) {
      setDeletingParty(null)
    }
    setDeleteModalOpen(open)
  }

  if (isLoading) {
    return <LoadingView message="사업자 정보를 불러오는 중입니다" />
  }

  if (isError) {
    return <ErrorView message="사업자 정보를 불러오지 못했습니다" />
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground">세금계산서 관리</h1>
          <p className="text-sm text-muted-foreground">
            세금계산서 발급용 사업자 마스터 정보를 관리합니다.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="새로고침"
          >
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
          {writable && (
            <Button type="button" onClick={() => setPartyModalOpen(true)}>
              <Plus className="size-4" />
              추가
            </Button>
          )}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-card p-3">
        <div className="flex gap-2">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch()
            }}
            placeholder="사업자명 또는 사업자번호 검색"
            aria-label="사업자 정보 검색"
          />
          <Button type="button" onClick={handleSearch}>
            <Search className="size-4" />
            검색
          </Button>
        </div>
      </div>

      {parties && parties.length > 0 ? (
        <div className="space-y-3">
          {parties.map((party) => (
            <TaxPartyCard
              key={party.id}
              party={party}
              writable={writable}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          등록된 사업자가 없습니다
        </div>
      )}

      {writable && (
        <TaxPartyModal
          open={partyModalOpen}
          onOpenChange={handlePartyModalOpenChange}
          party={editingParty}
        />
      )}

      {writable && deletingParty && (
        <DeleteTaxPartyModal
          open={deleteModalOpen}
          onOpenChange={handleDeleteModalOpenChange}
          party={deletingParty}
        />
      )}
    </div>
  )
}
