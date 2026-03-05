"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCollectionRequests } from "../hooks/use-collections"
import { CollectionRequestCard } from "./collection-request-card"

const STATUS_OPTIONS = [
  { value: "PENDING", label: "대기 중" },
  { value: "REJECTED", label: "거부" },
] as const

export function CollectionRequestsTab() {
  const [status, setStatus] = useState("PENDING")

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollectionRequests(status)

  const requests = useMemo(
    () => data?.pages.flatMap((page) => page.requests) ?? [],
    [data]
  )

  // 무한 스크롤
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

  return (
    <div>
      {/* 상태 필터 */}
      <div className="flex gap-1 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={status === opt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 목록 */}
      {!isLoading && (
        <div className="space-y-3">
          {requests.length > 0 ? (
            requests.map((req) => (
              <CollectionRequestCard key={req.id} request={req} />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              {status === "PENDING" ? "대기 중인 요청이 없습니다" : "요청이 없습니다"}
            </div>
          )}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
      )}
    </div>
  )
}
