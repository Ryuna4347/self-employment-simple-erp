"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Plus, Search, LayoutTemplate, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserFilter } from "@/components/common/user-filter"
import { StoreTemplateCard, StoreTemplateModal } from "./index"
import {
  useStoreTemplatesInfinite,
  useCreateStoreTemplate,
  useUpdateStoreTemplate,
  useDeleteStoreTemplate,
  type StoreTemplate,
  type StoreTemplateInput,
} from "../hooks/use-store-templates"

interface StoreTemplatesClientProps {
  userId: string
  userRole: "ADMIN" | "USER"
}

/**
 * 매장 코스 관리 클라이언트 컴포넌트
 */
export function StoreTemplatesClient({ userId, userRole }: StoreTemplatesClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchTemplateName, setSearchTemplateName] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StoreTemplate | null>(null)

  const isAdmin = userRole === "ADMIN"

  // react-query 훅 - selectedUserId로 필터링
  const {
    data,
    isLoading,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStoreTemplatesInfinite(selectedUserId, searchTemplateName || undefined)
  const createMutation = useCreateStoreTemplate()
  const updateMutation = useUpdateStoreTemplate()
  const deleteMutation = useDeleteStoreTemplate()

  // 페이지 플래튼
  const templates = useMemo(
    () => data?.pages.flatMap((page) => page.templates) ?? [],
    [data]
  )

  // 무한 스크롤 트리거
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 검색 실행
  const handleSearch = useCallback(() => {
    setSearchTemplateName(searchTerm.trim())
  }, [searchTerm])

  // 코스 추가 버튼 핸들러
  const handleAddTemplate = () => {
    setEditingTemplate(null)
    setIsModalOpen(true)
  }

  // 코스 수정 버튼 핸들러
  const handleEditTemplate = (template: StoreTemplate) => {
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  // 코스 삭제 핸들러
  const handleDeleteTemplate = (id: string) => {
    deleteMutation.mutate(id)
  }

  // 모달 제출 핸들러
  const handleModalSubmit = (data: StoreTemplateInput) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingTemplate(null)
          },
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false)
        },
      })
    }
  }

  // 삭제 진행 중인 코스 ID
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">매장 코스 관리</h1>
        <p className="text-gray-600 text-sm">
          자주 방문하는 매장 그룹을 코스으로 저장하여 빠르게 근무를 등록하세요
        </p>
      </div>

      {/* 사용자 필터 */}
      <UserFilter
        selectedUserId={selectedUserId}
        onUserChange={setSelectedUserId}
        currentUserId={userId}
      />

      {/* 검색 */}
      <div className="flex gap-1.5 mb-4">
        <Input
          className="h-8 text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
          }}
          placeholder="코스 검색..."
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* 코스 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          // 로딩 상태
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : templates.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
            <LayoutTemplate className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {searchTemplateName ? "검색 결과가 없습니다" : "등록된 코스이 없습니다"}
            </p>
            {!searchTemplateName && (
              <p className="text-gray-400 text-sm mt-1">
                우측 하단 버튼을 눌러 코스을 추가하세요
              </p>
            )}
          </div>
        ) : (
          // 코스 리스트
          templates.map((template) => (
            <StoreTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              isAdmin={isAdmin}
              isDeleting={deletingId === template.id}
            />
          ))
        )}
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="fixed bottom-[9.5rem] right-7 size-12 rounded-full shadow-md transition-all z-40 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="새로고침"
      >
        <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} />
      </button>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={handleAddTemplate}
        className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="코스 추가"
      >
        <Plus className="size-6" />
      </button>

      {/* 코스 추가/수정 모달 */}
      <StoreTemplateModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        onSubmit={handleModalSubmit}
        editTemplate={editingTemplate}
        isLoading={isSubmitting}
      />
    </div>
  )
}
