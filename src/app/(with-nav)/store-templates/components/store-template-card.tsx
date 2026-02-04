"use client"

import { useState } from "react"
import { MapPin, ChevronDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { StoreTemplate } from "../hooks/use-store-templates"

interface StoreTemplateCardProps {
  template: StoreTemplate
  onEdit: (template: StoreTemplate) => void
  onDelete: (id: string) => void
}

/**
 * 매장 템플릿 카드 컴포넌트 (Accordion)
 *
 * 축약 모드 (기본):
 * - 템플릿명 + 매장 수 배지
 * - 설명
 *
 * 상세 모드 (클릭 시 확장):
 * - 매장 목록 (방문 순서)
 * - 적용/수정/삭제 버튼
 */
export function StoreTemplateCard({
  template,
  onEdit,
  onDelete,
}: StoreTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(template)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("정말로 이 템플릿을 삭제하시겠습니까?")) {
      onDelete(template.id)
    }
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all",
        "hover:shadow-md"
      )}
    >
      {/* 축약 모드 - 클릭 가능 영역 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left focus:outline-none p-4"
      >
        <div className="flex items-start justify-between gap-3">
          {/* 좌측: 템플릿 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {template.name}
              </h3>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {template.memberCount}개 매장
              </span>
            </div>
            {template.description && (
              <p className="text-sm text-gray-600 line-clamp-1">
                {template.description}
              </p>
            )}
          </div>

          {/* 우측: 확장 아이콘 */}
          <ChevronDown
            className={cn(
              "size-5 text-gray-400 transition-transform duration-300 flex-shrink-0",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* 상세 모드 - 확장 영역 (grid-rows 애니메이션) */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* 매장 목록 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                소속 매장 (방문 순서)
              </h4>
              <div className="space-y-2">
                {template.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    {/* 순서 번호 */}
                    <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                      {member.order + 1}
                    </div>
                    {/* 매장 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {member.store.name}
                      </p>
                      <p className="text-gray-600 text-xs flex items-center gap-1">
                        <MapPin className="size-3" />
                        <span className="line-clamp-1">{member.store.address}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex-1"
              >
                <Pencil className="size-4" />
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
