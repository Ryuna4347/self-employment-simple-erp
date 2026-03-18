"use client"

import { format } from "date-fns"
import { Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { NoticeRecord } from "../hooks/use-notices"

interface NoticeCardProps {
  notice: NoticeRecord
  onEdit: (notice: NoticeRecord) => void
  onDelete: (notice: NoticeRecord) => void
}

export function NoticeCard({ notice, onEdit, onDelete }: NoticeCardProps) {
  const isExpired = notice.expiresAt && new Date(notice.expiresAt) < new Date()

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${isExpired ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-400">
              {format(new Date(notice.createdAt), "yyyy-MM-dd HH:mm")}
            </span>
            <span className="text-xs text-gray-400">{notice.author.name}</span>
            {isExpired && (
              <span className="text-xs text-red-400 font-medium">만료됨</span>
            )}
            {notice.expiresAt && !isExpired && (
              <span className="text-xs text-orange-400">
                ~{format(new Date(notice.expiresAt), "MM/dd")}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900">{notice.title}</p>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">
            {notice.content}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onEdit(notice)}
          >
            <Pencil className="size-3.5 text-gray-400" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onDelete(notice)}
          >
            <Trash2 className="size-3.5 text-gray-400" />
          </Button>
        </div>
      </div>
    </div>
  )
}
