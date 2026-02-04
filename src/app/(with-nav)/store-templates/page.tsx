"use client"

import { useState, useMemo } from "react"
import { Plus, Search, LayoutTemplate } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StoreTemplateCard, StoreTemplateModal } from "./components"
import {
  useStoreTemplates,
  useCreateStoreTemplate,
  useUpdateStoreTemplate,
  useDeleteStoreTemplate,
  type StoreTemplate,
  type StoreTemplateInput,
} from "./hooks/use-store-templates"

/**
 * 매장 템플릿 관리 페이지
 */
export default function StoreTemplatesPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<StoreTemplate | null>(null)

  // react-query 훅
  const { data: templates = [], isLoading } = useStoreTemplates()
  const createMutation = useCreateStoreTemplate()
  const updateMutation = useUpdateStoreTemplate()
  const deleteMutation = useDeleteStoreTemplate()

  // 검색 필터링 (클라이언트)
  const filteredTemplates = useMemo(() => {
    if (!searchTerm.trim()) return templates
    const term = searchTerm.toLowerCase()
    return templates.filter(
      (template) =>
        template.name.toLowerCase().includes(term) ||
        (template.description?.toLowerCase().includes(term) ?? false)
    )
  }, [templates, searchTerm])

  // 템플릿 추가 버튼 핸들러
  const handleAddTemplate = () => {
    setEditingTemplate(null)
    setIsModalOpen(true)
  }

  // 템플릿 수정 버튼 핸들러
  const handleEditTemplate = (template: StoreTemplate) => {
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  // 템플릿 삭제 핸들러
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

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">매장 템플릿 관리</h1>
        <p className="text-gray-600 text-sm">
          자주 방문하는 매장 그룹을 템플릿으로 저장하여 빠르게 근무를 등록하세요
        </p>
      </div>

      {/* 검색 */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="템플릿 검색..."
            className="pl-10"
          />
        </div>
      </div>

      {/* 템플릿 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          // 로딩 상태
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : filteredTemplates.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
            <LayoutTemplate className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {searchTerm ? "검색 결과가 없습니다" : "등록된 템플릿이 없습니다"}
            </p>
            {!searchTerm && (
              <p className="text-gray-400 text-sm mt-1">
                우측 하단 버튼을 눌러 템플릿을 추가하세요
              </p>
            )}
          </div>
        ) : (
          // 템플릿 리스트
          filteredTemplates.map((template) => (
            <StoreTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
            />
          ))
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={handleAddTemplate}
        className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="템플릿 추가"
      >
        <Plus className="size-6" />
      </button>

      {/* 템플릿 추가/수정 모달 */}
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
