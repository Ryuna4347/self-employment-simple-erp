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
import type { Role } from "@/generated/prisma/client"

interface CollectionRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string | null
  storeName: string
  userRole: Role
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

  // 같은 pendingRequestId(non-null)를 공유하는 record들의 그룹 매핑
  // - ADMIN: 그룹 동기 토글에 사용
  // - USER: 표시 용도(disabled + 라벨)
  const groupMap = useMemo(() => {
    const map = new Map<string, Set<string>>()
    if (!uncollectedRecords) return map
    for (const r of uncollectedRecords) {
      if (!r.pendingRequestId) continue
      const set = map.get(r.pendingRequestId) ?? new Set<string>()
      set.add(r.id)
      map.set(r.pendingRequestId, set)
    }
    return map
  }, [uncollectedRecords])

  // 선택 가능한 record id 집합
  // - ADMIN: 모든 record 선택 가능
  // - USER: pendingRequestId === null 인 record만 선택 가능
  const selectableIds = useMemo(() => {
    if (!uncollectedRecords) return new Set<string>()
    if (isAdmin) return new Set(uncollectedRecords.map((r) => r.id))
    return new Set(uncollectedRecords.filter((r) => r.pendingRequestId === null).map((r) => r.id))
  }, [uncollectedRecords, isAdmin])

  // 데이터 로드 시 초기 선택 상태 세팅
  // - ADMIN: 모든 record
  // - USER: 선택 가능한(non-pending) record만
  if (uncollectedRecords && !initialized) {
    setSelectedIds(new Set(selectableIds))
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
    if (!uncollectedRecords) return
    const record = uncollectedRecords.find((r) => r.id === id)
    if (!record) return

    // USER: PENDING 묶임 record는 토글 무시
    if (!isAdmin && record.pendingRequestId !== null) return

    // ADMIN: 그룹 record면 그룹 전체 동기 토글
    const targetIds: Set<string> =
      isAdmin && record.pendingRequestId
        ? groupMap.get(record.pendingRequestId) ?? new Set([id])
        : new Set([id])

    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = Array.from(targetIds).every((tid) => prev.has(tid))
      if (allSelected) {
        targetIds.forEach((tid) => next.delete(tid))
      } else {
        targetIds.forEach((tid) => next.add(tid))
      }
      return next
    })
  }

  // "전체 선택" 토글
  // - ADMIN: 모든 ID 선택/해제 (단순화)
  // - USER: 선택 가능한(non-pending) ID만 선택/해제
  const toggleAll = () => {
    if (!uncollectedRecords) return
    const allSelected = selectableIds.size > 0 && Array.from(selectableIds).every((id) => selectedIds.has(id))
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableIds))
    }
  }

  const allSelectableSelected =
    selectableIds.size > 0 && Array.from(selectableIds).every((id) => selectedIds.has(id))

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
                  checked={allSelectableSelected}
                  onCheckedChange={toggleAll}
                  disabled={selectableIds.size === 0}
                />
                <span className="text-sm font-medium text-gray-700">
                  전체 선택 ({selectedIds.size}/{uncollectedRecords.length})
                </span>
              </div>

              {/* 레코드 목록 */}
              <div className="space-y-2">
                {uncollectedRecords.map((r) => {
                  const isPendingRecord = r.pendingRequestId !== null
                  const userDisabled = !isAdmin && isPendingRecord
                  return (
                    <label
                      key={r.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${
                        userDisabled
                          ? "bg-gray-50 cursor-not-allowed opacity-70"
                          : "hover:bg-gray-50 cursor-pointer"
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(r.id)}
                        onCheckedChange={() => toggleId(r.id)}
                        disabled={userDisabled}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">{r.date}</p>
                          {/* USER: 확인 요청중 라벨, ADMIN: 요청 묶음 라벨 */}
                          {isPendingRecord && (
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                isAdmin
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {isAdmin ? "요청 묶음" : "확인 요청중"}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {r.items.map((i) => i.name).join(", ")}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 shrink-0">
                        {r.totalAmount.toLocaleString()}원
                      </span>
                    </label>
                  )
                })}
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
