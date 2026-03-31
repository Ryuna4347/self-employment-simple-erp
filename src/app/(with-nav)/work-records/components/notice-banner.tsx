"use client"

import { useState, useCallback } from "react"
import { format } from "date-fns"
import { ChevronDown, ChevronUp, Megaphone } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useLatestNotice } from "../hooks/use-latest-notice"

// localStorage 키 생성
function getReadKey(noticeId: string) {
  return `notice-read-${noticeId}`
}

// 읽음 여부 확인
function isNoticeRead(noticeId: string): boolean {
  if (typeof window === "undefined") return false
  return localStorage.getItem(getReadKey(noticeId)) === "true"
}

// 읽음 처리
function markNoticeAsRead(noticeId: string) {
  localStorage.setItem(getReadKey(noticeId), "true")
}

export function NoticeBanner() {
  const { data: notice } = useLatestNotice()

  if (!notice) return null

  // key={notice.id}로 공지가 바뀌면 컴포넌트가 리마운트되어 초기 상태가 재계산됨
  return (
    <NoticeBannerInner
      key={notice.id}
      notice={notice}
    />
  )
}

interface NoticeData {
  id: string
  title: string
  content: string
  createdAt: string
  author: { name: string }
}

function NoticeBannerInner({ notice }: { notice: NoticeData }) {
  const [isOpen, setIsOpen] = useState(() => !isNoticeRead(notice.id))

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      if (!open) {
        markNoticeAsRead(notice.id)
      }
    },
    [notice.id]
  )

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className="mb-4">
      <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg bg-red-50/80 border border-red-200 px-3 py-2.5 text-left hover:bg-red-100/80 transition-colors">
        <Megaphone className="size-4 text-red-600 shrink-0" />
        <span className="flex-1 text-sm font-medium text-red-900 truncate">
          {notice.title}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4 text-red-500 shrink-0" />
        ) : (
          <ChevronDown className="size-4 text-red-500 shrink-0" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="rounded-b-lg bg-red-50/50 border border-t-0 border-red-200 px-3 py-3">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {notice.content}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {notice.author.name} · {format(new Date(notice.createdAt), "yyyy-MM-dd HH:mm")}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
