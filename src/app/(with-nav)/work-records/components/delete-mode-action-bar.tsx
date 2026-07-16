"use client"

import { Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

interface DeleteModeActionBarProps {
  selectedCount: number
  selectableCount: number
  allSelected: boolean
  onToggleAll: () => void
  onDeleteSelected: () => void
  onDeleteAll: () => void
  onCancel: () => void
}

/**
 * 삭제 모드 하단 고정 액션 바
 * - 전체 선택 체크박스 (로드된 삭제 가능 기록 기준)
 * - 취소 / 전체 삭제(필터 기반) / 선택 삭제 버튼
 * - 하단 네비게이션 바로 위에 고정 표시
 */
export function DeleteModeActionBar({
  selectedCount,
  selectableCount,
  allSelected,
  onToggleAll,
  onDeleteSelected,
  onDeleteAll,
  onCancel,
}: DeleteModeActionBarProps) {
  return (
    <div className="fixed bottom-[5rem] inset-x-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
      {/* 좁은 화면에서는 전체 선택/버튼이 두 줄로 줄바꿈된다 */}
      <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
          <Checkbox
            checked={allSelected}
            disabled={selectableCount === 0}
            onCheckedChange={onToggleAll}
            aria-label="전체 선택"
            className="size-5"
          />
          <span className="text-sm text-gray-700">
            전체 선택 ({selectedCount}/{selectableCount})
          </span>
        </label>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="size-4" />
            취소
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            전체 삭제
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDeleteSelected}
            disabled={selectedCount === 0}
          >
            <Trash2 className="size-4" />
            선택 삭제{selectedCount > 0 && ` ${selectedCount}건`}
          </Button>
        </div>
      </div>
    </div>
  )
}
