"use client"

import { useState, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { useStoreUncollected } from "../hooks/use-store-uncollected"
import { useCreateCollectionRequest } from "../hooks/use-collection-request"
import { useBatchCollect } from "../hooks/use-batch-collect"

interface CollectionRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string | null
  storeName: string
  userRole: "ADMIN" | "USER"
}

export function CollectionRequestModal({
  open,
  onOpenChange,
  storeId,
  storeName,
  userRole,
}: CollectionRequestModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [note, setNote] = useState("")
  const [initialized, setInitialized] = useState(false)

  const isAdmin = userRole === "ADMIN"
  const { data: uncollectedRecords, isLoading } = useStoreUncollected(open ? storeId : null)
  const createMutation = useCreateCollectionRequest()
  const batchCollectMutation = useBatchCollect()

  // 가장 최근(마지막) 기록 ID - 항상 선택 고정
  const latestId = uncollectedRecords?.[uncollectedRecords.length - 1]?.id

  // 데이터 로드 시 전체 선택 초기화
  if (uncollectedRecords && !initialized) {
    setSelectedIds(new Set(uncollectedRecords.map((r) => r.id)))
    setInitialized(true)
  }

  // 모달 닫힐 때 상태 초기화
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIds(new Set())
      setNote("")
      setInitialized(false)
    }
    onOpenChange(open)
  }

  const toggleId = (id: string) => {
    if (id === latestId) return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleAll = () => {
    if (!uncollectedRecords) return
    if (selectedIds.size === uncollectedRecords.length) {
      setSelectedIds(new Set(latestId ? [latestId] : []))
    } else {
      setSelectedIds(new Set(uncollectedRecords.map((r) => r.id)))
    }
  }

  const selectedTotal = useMemo(() => {
    if (!uncollectedRecords) return 0
    return uncollectedRecords
      .filter((r) => selectedIds.has(r.id))
      .reduce((sum, r) => sum + r.totalAmount, 0)
  }, [uncollectedRecords, selectedIds])

  const isPending = createMutation.isPending || batchCollectMutation.isPending

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error("최소 1건 이상 선택해주세요")
      return
    }

    const workRecordIds = Array.from(selectedIds)

    if (isAdmin) {
      // 어드민: 직접 일괄 수금 처리
      batchCollectMutation.mutate(
        { workRecordIds },
        {
          onSuccess: () => {
            toast.success("일괄 수금 처리가 완료되었습니다")
            handleOpenChange(false)
          },
          onError: () => {
            toast.error("수금 처리에 실패했습니다")
          },
        }
      )
    } else {
      // 일반 유저: 수금 확인 요청
      createMutation.mutate(
        {
          storeId: storeId ?? undefined,
          storeNameSnapshot: storeName,
          workRecordIds,
          note: note.trim() || undefined,
        },
        {
          onSuccess: () => {
            toast.success("수금 확인 요청이 제출되었습니다")
            handleOpenChange(false)
          },
          onError: () => {
            toast.error("요청 제출에 실패했습니다")
          },
        }
      )
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isAdmin ? "일괄 수금 처리" : "수금 확인 요청"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isAdmin
              ? `${storeName}의 미수금 내역을 선택하여 일괄 수금 처리합니다`
              : `${storeName}의 미수금 내역을 선택하여 수금 확인을 요청합니다`}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : !uncollectedRecords?.length ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              미수금 내역이 없습니다
            </div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={selectedIds.size === uncollectedRecords.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium text-gray-700">
                  전체 선택 ({selectedIds.size}/{uncollectedRecords.length})
                </span>
              </div>

              {/* 레코드 목록 */}
              <div className="space-y-2">
                {uncollectedRecords.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(r.id)}
                      onCheckedChange={() => toggleId(r.id)}
                      disabled={r.id === latestId}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.date}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {r.items.map((i) => i.name).join(", ")}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {r.totalAmount.toLocaleString()}원
                    </span>
                  </label>
                ))}
              </div>

              {/* 선택 합계 */}
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-gray-600">선택 합계</span>
                <span className="text-base font-bold text-red-600">
                  {selectedTotal.toLocaleString()}원
                </span>
              </div>

              {/* 메모 입력 (유저 모드만) */}
              {!isAdmin && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    메모 (선택)
                  </label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="관리자에게 전달할 메모를 입력하세요"
                    className="resize-none"
                    rows={2}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <ResponsiveModalFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || selectedIds.size === 0}
            className="w-full"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {isAdmin
              ? `수금 처리 (${selectedIds.size}건, ${selectedTotal.toLocaleString()}원)`
              : `수금 확인 요청 (${selectedIds.size}건, ${selectedTotal.toLocaleString()}원)`}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
