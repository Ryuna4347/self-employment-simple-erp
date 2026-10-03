"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { Plus, Search, LayoutTemplate } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { UserFilter } from "@/components/common/user-filter"
import { RefreshFab } from "@/components/common/refresh-fab"
import { MountOnFirstOpen } from "@/components/common/mount-on-first-open"
import { StoreTemplateCard } from "./store-template-card"
import {
  useStoreTemplatesInfinite,
  useCreateStoreTemplate,
  useUpdateStoreTemplate,
  useDeleteStoreTemplate,
  type StoreTemplate,
  type UpdateStoreTemplateInput,
} from "../hooks/use-store-templates"
import type { Role } from "@/generated/prisma/client"
import { canWrite } from "@/lib/role-utils"
import { preloadOnIdle } from "@/lib/preload-on-idle"

// 코스 추가/수정 모달(드래그 정렬·폼 포함)은 열 때만 필요하므로 초기 번들에서 분리한다
// (로더는 next/dynamic과 미리 받기에서 함께 써야 같은 청크를 재사용한다)
const loadStoreTemplateModal = () => import("./store-template-modal")
const StoreTemplateModal = dynamic(
  () => loadStoreTemplateModal().then((m) => m.StoreTemplateModal),
  { ssr: false }
)

interface StoreTemplatesClientProps {
  userId: string
  userRole: Role
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
  const writable = canWrite(userRole)

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

  // 목록을 그린 뒤 유휴 시간에 모달 청크를 미리 받아 첫 오픈 지연을 없앤다
  const shouldPreloadModal = writable && !isLoading
  useEffect(() => {
    if (!shouldPreloadModal) return
    return preloadOnIdle([loadStoreTemplateModal])
  }, [shouldPreloadModal])

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
  const handleModalSubmit = (data: UpdateStoreTemplateInput) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, ...data },
        {
          onSuccess: (result) => {
            setIsModalOpen(false)
            setEditingTemplate(null)
            // 담당자 이전 결과 안내 (이전된 코스는 본인 필터 목록에서 빠짐)
            if (data.ownerId) {
              toast.success(
                result.transferredStoreCount > 0
                  ? `코스를 이전했습니다 (매장 ${result.transferredStoreCount}개 담당자 변경)`
                  : "코스를 이전했습니다"
              )
            }
          },
        }
      )
    } else {
      const { name, description, members } = data
      createMutation.mutate({ name, description, members }, {
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
              onEdit={
                writable && (isAdmin || template.userId === userId)
                  ? handleEditTemplate
                  : undefined
              }
              onDelete={writable ? handleDeleteTemplate : undefined}
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
      <RefreshFab
        onRefresh={() => refetch()}
        isFetching={isFetching}
        offset="stacked"
      />

      {/* FAB (Floating Action Button) */}
      {writable && (
        <button
          onClick={handleAddTemplate}
          className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="코스 추가"
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* 코스 추가/수정 모달 (처음 열 때 마운트) */}
      {writable && (
        <MountOnFirstOpen open={isModalOpen}>
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
        </MountOnFirstOpen>
      )}
    </div>
  )
}
