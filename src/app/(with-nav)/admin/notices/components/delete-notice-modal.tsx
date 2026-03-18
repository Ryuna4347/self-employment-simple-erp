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
import { useDeleteNotice, type NoticeRecord } from "../hooks/use-notices"

interface DeleteNoticeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notice: NoticeRecord
}

export function DeleteNoticeModal({ open, onOpenChange, notice }: DeleteNoticeModalProps) {
  const deleteMutation = useDeleteNotice()

  const handleDelete = () => {
    deleteMutation.mutate(notice.id, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>공지 삭제</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            <strong>{notice.title}</strong> 공지를 삭제하시겠습니까?
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
