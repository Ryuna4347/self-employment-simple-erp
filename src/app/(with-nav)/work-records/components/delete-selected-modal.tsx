"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useBulkDeleteWorkRecordsByIds } from "../hooks/use-work-records"

interface DeleteSelectedModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedIds: string[]
  /** 삭제 성공 시 호출 (삭제 모드 종료용) */
  onDeleted?: () => void
}

const CONFIRM_TEXT = "삭제"

export function DeleteSelectedModal({
  open,
  onOpenChange,
  selectedIds,
  onDeleted,
}: DeleteSelectedModalProps) {
  const [confirmText, setConfirmText] = useState("")
  const bulkDeleteMutation = useBulkDeleteWorkRecordsByIds()
  const isPending = bulkDeleteMutation.isPending

  // 2건 이상 삭제 시에는 전체 삭제와 동일하게 확인 텍스트 입력을 요구한다
  const requiresConfirmText = selectedIds.length >= 2
  const isConfirmed = !requiresConfirmText || confirmText === CONFIRM_TEXT

  const handleDelete = () => {
    if (selectedIds.length === 0 || !isConfirmed) return

    bulkDeleteMutation.mutate(selectedIds, {
      onSuccess: (result) => {
        if (result.deleted > 0) {
          const parts = [`${result.deleted}개 기록이 삭제되었습니다`]
          if (result.skipped > 0) parts.push(`권한 없음 ${result.skipped}개 제외`)
          toast.success(parts.join(" · "))
        } else if (result.skipped > 0) {
          toast.info(`삭제 권한이 없는 ${result.skipped}개 기록은 제외되었습니다`)
        } else {
          toast.info("삭제할 기록이 없습니다")
        }
        setConfirmText("")
        onOpenChange(false)
        onDeleted?.()
      },
    })
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isPending) return
    if (!isOpen) setConfirmText("")
    onOpenChange(isOpen)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            선택한 근무기록 삭제
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            선택한 {selectedIds.length}건의 근무기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="space-y-4 py-4 px-4 sm:px-1">
          {/* 경고 박스 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 space-y-1">
                <p className="font-semibold">
                  선택한 {selectedIds.length}건을 삭제하시겠습니까?
                </p>
                <p className="text-red-700">
                  삭제된 근무기록과 거래 내역(품목)은 복구할 수 없습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 확인 입력 (2건 이상 삭제 시) */}
          {requiresConfirmText && (
            <div className="space-y-2">
              <Label htmlFor="confirm-selected-text">
                계속하려면 아래 칸에 <span className="font-bold text-red-600">{CONFIRM_TEXT}</span>
                {" "}라고 정확히 입력하세요
              </Label>
              <Input
                id="confirm-selected-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={CONFIRM_TEXT}
                disabled={isPending}
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={selectedIds.length === 0 || !isConfirmed || isPending}
          >
            {isPending ? "삭제 중..." : `${selectedIds.length}건 삭제`}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
