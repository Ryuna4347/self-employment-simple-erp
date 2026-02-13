"use client"

import { useState } from "react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RemoveStaffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  onConfirm: () => void
  isLoading: boolean
}

export function RemoveStaffModal({
  open,
  onOpenChange,
  memberName,
  onConfirm,
  isLoading,
}: RemoveStaffModalProps) {
  const [confirmName, setConfirmName] = useState("")

  const isMatch = confirmName === memberName

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmName("")
    }
    onOpenChange(newOpen)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>직원 삭제</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            <strong>{memberName}</strong>님을 삭제하시겠습니까? 삭제된 직원은 더
            이상 로그인할 수 없습니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="px-4 sm:px-0">
          <Input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={`"${memberName}" 을(를) 입력하세요`}
            disabled={isLoading}
          />
        </div>

        <ResponsiveModalFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!isMatch || isLoading}
          >
            {isLoading ? "삭제 중..." : "삭제"}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
