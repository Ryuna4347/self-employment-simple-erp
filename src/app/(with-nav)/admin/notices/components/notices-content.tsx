"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotices, type NoticeRecord } from "../hooks/use-notices"
import { NoticeCard } from "./notice-card"
import { NoticeModal } from "./notice-modal"
import { DeleteNoticeModal } from "./delete-notice-modal"

export function NoticesContent() {
  // 모달 상태
  const [noticeModalOpen, setNoticeModalOpen] = useState(false)
  const [editingNotice, setEditingNotice] = useState<NoticeRecord | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingNotice, setDeletingNotice] = useState<NoticeRecord | null>(null)

  const { data: notices, isLoading, isError } = useNotices()

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
        <Button
          size="sm"
          onClick={() => setNoticeModalOpen(true)}
        >
          <Plus className="size-4" />
          작성
        </Button>
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
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              등록된 공지가 없습니다
            </div>
          )}
        </div>
      )}

      {/* 생성/수정 모달 */}
      <NoticeModal
        open={noticeModalOpen}
        onOpenChange={handleModalClose}
        editingNotice={editingNotice}
      />

      {/* 삭제 확인 모달 */}
      {deletingNotice && (
        <DeleteNoticeModal
          open={deleteModalOpen}
          onOpenChange={handleDeleteModalClose}
          notice={deletingNotice}
        />
      )}
    </div>
  )
}
