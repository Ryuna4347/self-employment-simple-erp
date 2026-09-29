"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/empty-state"
import { RefreshFab } from "@/components/common/refresh-fab"
import { MountOnFirstOpen } from "@/components/common/mount-on-first-open"
import { StaffCard } from "./staff-card"
import { useStaff, useDeleteStaff, type StaffMember } from "../hooks/use-staff"
import { useUser } from "@/components/providers/app-providers"
import { canWrite } from "@/lib/role-utils"
import { preloadOnIdle } from "@/lib/preload-on-idle"

// 모달은 열 때만 필요하므로 초기 번들에서 분리한다
// (로더는 next/dynamic과 미리 받기에서 함께 써야 같은 청크를 재사용한다)
const loadInviteModal = () => import("./invite-modal")
const loadRemoveStaffModal = () => import("./remove-staff-modal")

const InviteModal = dynamic(
  () => loadInviteModal().then((m) => m.InviteModal),
  { ssr: false }
)
const RemoveStaffModal = dynamic(
  () => loadRemoveStaffModal().then((m) => m.RemoveStaffModal),
  { ssr: false }
)

export function StaffContent() {
  const { role } = useUser()
  const writable = canWrite(role)
  // 모달 상태
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null)

  // react-query
  const { data: staff = [], isLoading, isFetching, refetch } = useStaff()
  const deleteMutation = useDeleteStaff()

  // 목록을 그린 뒤 유휴 시간에 모달 청크를 미리 받아 첫 오픈 지연을 없앤다
  const shouldPreloadModals = writable && !isLoading
  useEffect(() => {
    if (!shouldPreloadModals) return
    return preloadOnIdle([loadInviteModal, loadRemoveStaffModal])
  }, [shouldPreloadModals])

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
        {writable && (
          <Button size="sm" onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="size-4" />
            초대
          </Button>
        )}
      </div>

      {/* 직원 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : staff.length === 0 ? (
          <EmptyState
            icon={Users}
            title="등록된 직원이 없습니다"
            description="초대 버튼을 눌러 직원을 초대하세요"
          />
        ) : (
          staff.map((member) => (
            <StaffCard
              key={member.id}
              member={member}
              onRemove={writable ? setRemoveTarget : undefined}
            />
          ))
        )}
      </div>

      {/* 초대 모달 (처음 열 때 마운트) */}
      {writable && (
        <MountOnFirstOpen open={isInviteModalOpen}>
          <InviteModal
            open={isInviteModalOpen}
            onOpenChange={setIsInviteModalOpen}
          />
        </MountOnFirstOpen>
      )}

      {/* 삭제 확인 모달 (처음 열 때 마운트) */}
      {writable && (
        <MountOnFirstOpen open={removeTarget !== null}>
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
        </MountOnFirstOpen>
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  )
}
