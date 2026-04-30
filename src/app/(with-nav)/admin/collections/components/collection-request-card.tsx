"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser } from "@/components/providers/app-providers"
import { canWrite } from "@/lib/role-utils"
import {
  useApproveCollectionRequest,
  useRejectCollectionRequest,
  type CollectionRequestListItem,
} from "../hooks/use-collections"

// 날짜별 그룹 (같은 workRecord.date 끼리 묶음)
interface DateGroup {
  date: string
  records: CollectionRequestListItem["items"][number]["workRecord"][]
  total: number
}

// items 를 workRecord.date 기준으로 그룹핑.
// 백엔드가 이미 date 오름차순 정렬해서 내려주므로 추가 정렬 불필요.
function groupItemsByDate(items: CollectionRequestListItem["items"]): DateGroup[] {
  const groups: DateGroup[] = []
  for (const item of items) {
    const wr = item.workRecord
    const last = groups[groups.length - 1]
    if (last && last.date === wr.date) {
      last.records.push(wr)
      last.total += wr.itemsTotal
    } else {
      groups.push({ date: wr.date, records: [wr], total: wr.itemsTotal })
    }
  }
  return groups
}

interface CollectionRequestCardProps {
  request: CollectionRequestListItem
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING: { label: "대기 중", className: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "승인", className: "bg-blue-100 text-blue-700" },
  REJECTED: { label: "거부", className: "bg-red-100 text-red-700" },
}

export function CollectionRequestCard({ request }: CollectionRequestCardProps) {
  const { role } = useUser()
  const writable = canWrite(role)
  const [expanded, setExpanded] = useState(false)
  const approveMutation = useApproveCollectionRequest()
  const rejectMutation = useRejectCollectionRequest()

  const badge = STATUS_BADGE[request.status] ?? STATUS_BADGE.PENDING
  const isPending = request.status === "PENDING"
  const isProcessing = approveMutation.isPending || rejectMutation.isPending

  const dateGroups = useMemo(
    () => groupItemsByDate(request.items),
    [request.items]
  )

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
            {/* 날짜별 비용 목록 (collection-history-card 의 일괄 수금 영역과 동일 톤) */}
            {dateGroups.length > 0 && (
              <div className="space-y-3">
                {dateGroups.map((group) => (
                  <div key={group.date}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {group.date}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          group.total === 0 ? "text-gray-400" : "text-gray-900"
                        )}
                      >
                        {group.total.toLocaleString()}원
                      </span>
                    </div>
                    <div className="pl-2 space-y-0.5">
                      {group.records.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between text-xs text-gray-500"
                        >
                          <span className="truncate">
                            {rec.storeNameSnapshot ?? request.storeNameSnapshot}
                          </span>
                          <span>{rec.itemsTotal.toLocaleString()}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* 합계 행 (강조) */}
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-sm font-semibold text-muted-foreground">
                    합계
                  </span>
                  <span className="text-base font-bold text-red-600">
                    {request.totalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            )}

            {/* 메모 */}
            {request.note && (
              <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {request.note}
              </div>
            )}

            {/* 승인/거부 버튼 (PENDING이고 쓰기 권한이 있을 때만) */}
            {isPending && writable && (
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
