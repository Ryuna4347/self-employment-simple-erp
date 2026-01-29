"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SaleItem } from "../hooks/use-sale-items"

interface SaleItemCardProps {
  item: SaleItem
  onEdit: (item: SaleItem) => void
  onDelete: (id: string) => void
}

/**
 * 물품 카드 컴포넌트
 */
export function SaleItemCard({ item, onEdit, onDelete }: SaleItemCardProps) {
  const handleDelete = () => {
    if (confirm("정말로 이 물품을 삭제하시겠습니까?")) {
      onDelete(item.id)
    }
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all",
        "hover:shadow-md"
      )}
    >
      {/* 카드 콘텐츠 */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* 좌측: 물품 정보 */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-base mb-1">
              {item.name}
            </h3>
            <p className="text-gray-600 font-medium">
              {item.unitPrice.toLocaleString()}원
            </p>
          </div>

          {/* 우측: 액션 버튼 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(item)}
              className="text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            >
              <Pencil className="size-4" />
              <span className="sr-only">수정</span>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              <span className="sr-only">삭제</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
