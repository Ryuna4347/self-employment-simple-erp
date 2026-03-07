"use client"

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { useDeleteCost, type CostRecord } from "../hooks/use-costs"

interface DeleteCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cost: CostRecord
}

export function DeleteCostModal({ open, onOpenChange, cost }: DeleteCostModalProps) {
  const deleteMutation = useDeleteCost()

  const handleDelete = () => {
    deleteMutation.mutate(cost.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>비용 삭제</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            <strong>{cost.title}</strong> ({cost.amount.toLocaleString()}원) 을(를) 삭제하시겠습니까?
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ResponsiveModalFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            취소
          </Button>
          <Button
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
