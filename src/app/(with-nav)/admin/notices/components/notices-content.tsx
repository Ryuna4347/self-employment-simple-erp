"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RefreshFab } from "@/components/common/refresh-fab"
import { MountOnFirstOpen } from "@/components/common/mount-on-first-open"
import { useUser } from "@/components/providers/app-providers"
import { canWrite } from "@/lib/role-utils"
import { preloadOnIdle } from "@/lib/preload-on-idle"
import { useNotices, type NoticeRecord } from "../hooks/use-notices"
import { NoticeCard } from "./notice-card"

// 모달은 열 때만 필요하므로 초기 번들에서 분리한다
// (로더는 next/dynamic과 미리 받기에서 함께 써야 같은 청크를 재사용한다)
const loadNoticeModal = () => import("./notice-modal")
const loadDeleteNoticeModal = () => import("./delete-notice-modal")

const NoticeModal = dynamic(
  () => loadNoticeModal().then((m) => m.NoticeModal),
  { ssr: false }
)
const DeleteNoticeModal = dynamic(
  () => loadDeleteNoticeModal().then((m) => m.DeleteNoticeModal),
  { ssr: false }
)

export function NoticesContent() {
  const { role } = useUser()
  const writable = canWrite(role)
  // 모달 상태
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<NoticeRecord | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingNotice, setDeletingNotice] = useState<NoticeRecord | null>(null)

  const { data: notices, isLoading, isError, isFetching, refetch } = useNotices()

  // 목록을 그린 뒤 유휴 시간에 모달 청크를 미리 받아 첫 오픈 지연을 없앤다
  const shouldPreloadModals = writable && !isLoading
  useEffect(() => {
    if (!shouldPreloadModals) return
    return preloadOnIdle([loadNoticeModal, loadDeleteNoticeModal])
  }, [shouldPreloadModals])

  const handleEdit = (notice: NoticeRecord) => {
    setEditingNotice(notice)
    setNoticeModalOpen(true)
  }

  const handleDelete = (notice: NoticeRecord) => {
    setDeletingNotice(notice)
    setDeleteModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setEditingNotice(null)
    }
    setNoticeModalOpen(open)
  }

  const handleDeleteModalClose = (open: boolean) => {
    if (!open) {
      setDeletingNotice(null)
    }
    setDeleteModalOpen(open)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 상단: 제목 + 추가 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-gray-900">공지 관리</h1>
        {writable && (
          <Button
            size="sm"
            onClick={() => setNoticeModalOpen(true)}
          >
            <Plus className="size-4" />
            작성
          </Button>
        )}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 에러 */}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive text-sm">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        </div>
      )}

      {/* 공지 목록 */}
      {notices && (
        <div className="space-y-3">
          {notices.length > 0 ? (
            notices.map((notice) => (
              <NoticeCard
                key={notice.id}
                notice={notice}
                onEdit={writable ? handleEdit : undefined}
                onDelete={writable ? handleDelete : undefined}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              등록된 공지가 없습니다
            </div>
          )}
        </div>
      )}

      {/* 생성/수정 모달 (처음 열 때 마운트) */}
      {writable && (
        <MountOnFirstOpen open={noticeModalOpen}>
          <NoticeModal
            open={noticeModalOpen}
            onOpenChange={handleModalClose}
            editingNotice={editingNotice}
          />
        </MountOnFirstOpen>
      )}

      {/* 삭제 확인 모달 */}
      {writable && deletingNotice && (
        <DeleteNoticeModal
          open={deleteModalOpen}
          onOpenChange={handleDeleteModalClose}
          notice={deletingNotice}
        />
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  )
}
