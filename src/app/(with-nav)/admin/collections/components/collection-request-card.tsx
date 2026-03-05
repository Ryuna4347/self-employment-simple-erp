"use client"

import { useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  useApproveCollectionRequest,
  useRejectCollectionRequest,
  type CollectionRequestListItem,
} from "../hooks/use-collections"

interface CollectionRequestCardProps {
  request: CollectionRequestListItem
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "대기 중", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "승인", className: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "거부", className: "bg-red-100 text-red-700" },
}

export function CollectionRequestCard({ request }: CollectionRequestCardProps) {
  const [expanded, setExpanded] = useState(false)
  const approveMutation = useApproveCollectionRequest()
  const rejectMutation = useRejectCollectionRequest()

  const badge = STATUS_BADGE[request.status] ?? STATUS_BADGE.PENDING
  const isPending = request.status === "PENDING"
  const isProcessing = approveMutation.isPending || rejectMutation.isPending

  const handleApprove = () => {
    if (!confirm("이 수금 확인 요청을 승인하시겠습니까?")) return
    approveMutation.mutate(request.id, {
      onSuccess: () => toast.success("수금 확인 요청이 승인되었습니다"),
      onError: () => toast.error("승인 처리에 실패했습니다"),
    })
  }

  const handleReject = () => {
    if (!confirm("이 수금 확인 요청을 거부하시겠습니까?")) return
    rejectMutation.mutate(request.id, {
      onSuccess: () => toast.success("수금 확인 요청이 거부되었습니다"),
      onError: () => toast.error("거부 처리에 실패했습니다"),
    })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* 접힌 상태 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base truncate">
                {request.storeNameSnapshot}
              </h3>
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{request.requesterName}</span>
              <span>·</span>
              <span>{request.recordCount}건</span>
              <span>·</span>
              <span>{request.createdAt}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold text-red-600">
              {request.totalAmount.toLocaleString()}원
            </span>
            <ChevronDown
              className={cn(
                "size-5 text-gray-400 transition-transform duration-300",
                expanded && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {/* 펼친 상태 */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 p-4 space-y-3">
            {/* 메모 */}
            {request.note && (
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {request.note}
              </div>
            )}

            {/* 승인/거부 버튼 (PENDING일 때만) */}
            {isPending && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={handleApprove}
                  disabled={isProcessing}
                >
                  {approveMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  승인
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleReject}
                  disabled={isProcessing}
                >
                  {rejectMutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  거부
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
