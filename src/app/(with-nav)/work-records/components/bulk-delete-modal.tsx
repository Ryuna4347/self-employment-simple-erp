"use client"

import { useState } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
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
import { useBulkDeleteWorkRecords } from "../hooks/use-work-records"

interface BulkDeleteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  userId?: string
  search?: string
  estimatedCount: number
}

const CONFIRM_TEXT = "전체 삭제"

export function BulkDeleteModal({
  open,
  onOpenChange,
  selectedDate,
  userId,
  search,
  estimatedCount,
}: BulkDeleteModalProps) {
  const [confirmText, setConfirmText] = useState("")
  const bulkDeleteMutation = useBulkDeleteWorkRecords()

  const isConfirmed = confirmText === CONFIRM_TEXT
  const isPending = bulkDeleteMutation.isPending

  const handleDelete = () => {
    if (!isConfirmed) return

    bulkDeleteMutation.mutate(
      {
        date: format(selectedDate, "yyyy-MM-dd"),
        userId,
        search,
      },
      {
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
        },
      }
    )
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isPending) return
    if (!isOpen) setConfirmText("")
    onOpenChange(isOpen)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            근무기록 전체 삭제
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            현재 화면에 표시된 근무기록을 모두 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4 sm:px-1">
          {/* 삭제 대상 정보 */}
          <div className="space-y-2">
            <Label>삭제 대상</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm space-y-1">
              <div>
                <span className="text-gray-500">날짜: </span>
                {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
              </div>
              {search && (
                <div>
                  <span className="text-gray-500">검색어: </span>
                  {search}
                </div>
              )}
              <div>
                <span className="text-gray-500">건수: </span>
                <span className="font-semibold text-gray-900">약 {estimatedCount}건</span>
              </div>
            </div>
          </div>

          {/* 경고 박스 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 space-y-1">
                <p className="font-semibold">정말로 모두 삭제하시겠습니까?</p>
                <p className="text-red-700">
                  삭제된 근무기록과 거래 내역(품목)은 복구할 수 없습니다.
                  미수금이 아닌 기록(수금완료/휴업&폐업)은 관리자만 삭제할 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* 확인 입력 */}
          <div className="space-y-2">
            <Label htmlFor="confirm-text">
              계속하려면 아래 칸에 <span className="font-bold text-red-600">{CONFIRM_TEXT}</span>
              {" "}라고 정확히 입력하세요
            </Label>
            <Input
              id="confirm-text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_TEXT}
              disabled={isPending}
              autoComplete="off"
            />
          </div>
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
            disabled={!isConfirmed || isPending}
          >
            {isPending ? "삭제 중..." : "전체 삭제"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
