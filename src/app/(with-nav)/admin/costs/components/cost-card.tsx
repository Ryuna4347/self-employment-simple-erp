"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CostRecord } from "../hooks/use-costs"

interface CostCardProps {
  cost: CostRecord
  onEdit: (cost: CostRecord) => void
  onDelete: (cost: CostRecord) => void
}

export function CostCard({ cost, onEdit, onDelete }: CostCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">{cost.date}</span>
            <span className="text-xs text-gray-400">{cost.userName}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">
            {cost.title}
          </p>
          {cost.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {cost.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <p className="text-sm font-semibold text-orange-600 mr-2">
            {cost.amount.toLocaleString()}원
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onEdit(cost)}
          >
            <Pencil className="size-3.5 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onDelete(cost)}
          >
            <Trash2 className="size-3.5 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  )
}
