"use client"

import { useState } from "react"
import { UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StaffCard } from "./staff-card"
import { InviteModal } from "./invite-modal"
import { RemoveStaffModal } from "./remove-staff-modal"
import { useStaff, useDeleteStaff, type StaffMember } from "../hooks/use-staff"

export function StaffContent() {
  // 모달 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null)

  // react-query
  const { data: staff = [], isLoading } = useStaff()
  const deleteMutation = useDeleteStaff()

  // 삭제 핸들러
  const handleRemoveConfirm = () => {
    if (!removeTarget) return
    deleteMutation.mutate(removeTarget.id, {
      onSuccess: () => {
        setRemoveTarget(null)
      },
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">직원 관리</h1>
          <p className="text-gray-600 text-sm">직원을 초대하고 관리합니다</p>
        </div>
        <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="size-4" />
          초대
        </Button>
      </div>

      {/* 직원 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">등록된 직원이 없습니다</p>
            <p className="text-gray-400 text-sm mt-1">
              초대 버튼을 눌러 직원을 초대하세요
            </p>
          </div>
        ) : (
          staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onRemove={setRemoveTarget}
            />
          ))
        )}
      </div>

      {/* 초대 모달 */}
      <InviteModal
        open={isInviteModalOpen}
        onOpenChange={setIsInviteModalOpen}
      />

      {/* 삭제 확인 모달 */}
      <RemoveStaffModal
        key={removeTarget?.id}
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null)
        }}
        memberName={removeTarget?.name ?? ""}
        onConfirm={handleRemoveConfirm}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}
