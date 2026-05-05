"use client"

import { toast } from "sonner"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { useDeleteTaxParty, type TaxParty } from "../hooks/use-tax-parties"

interface DeleteTaxPartyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  party: TaxParty
}

export function DeleteTaxPartyModal({ open, onOpenChange, party }: DeleteTaxPartyModalProps) {
  const deleteMutation = useDeleteTaxParty()

  const handleDelete = () => {
    deleteMutation.mutate(party.id, {
      onSuccess: () => {
        toast.success("사업자 정보가 삭제되었습니다")
        onOpenChange(false)
      },
      onError: () => {
        toast.error("사업자 정보 삭제에 실패했습니다")
      },
    })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>사업자 정보 삭제</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            <strong>{party.name}</strong> 사업자 정보를 삭제하시겠습니까? 삭제 시 연결된
            매장의 사업자 정보 연결이 해제됩니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "삭제 중..." : "삭제"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
