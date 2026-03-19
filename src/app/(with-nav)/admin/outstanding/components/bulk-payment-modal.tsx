"use client"

import { useState, useMemo } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { useBatchToggleCollection } from "../hooks/use-outstanding"

export interface BulkPaymentRecord {
  id: string
  date: string
  totalAmount: number
}

interface BulkPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeName: string
  records: BulkPaymentRecord[]
}

/**
 * 일괄 수금 처리 모달
 *
 * 동일 매장의 미수금 레코드를 선택하여 한번에 수금 처리한다.
 */
export function BulkPaymentModal({
  open,
  onOpenChange,
  storeName,
  records,
}: BulkPaymentModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [initialized, setInitialized] = useState(false)
  const batchMutation = useBatchToggleCollection()

  // 모달 열릴 때 전체 선택 초기화
  if (open && records.length > 0 && !initialized) {
    setSelectedIds(new Set(records.map((r) => r.id)))
    setInitialized(true)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedIds(new Set())
      setInitialized(false)
    }
    onOpenChange(open)
  }

  const toggleId = (id: string) => {
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
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)))
    }
  }

  const selectedTotal = useMemo(() => {
    return records
      .filter((r) => selectedIds.has(r.id))
      .reduce((sum, r) => sum + r.totalAmount, 0)
  }, [records, selectedIds])

  const handleSubmit = () => {
    if (selectedIds.size === 0) {
      toast.error("최소 1건 이상 선택해주세요")
      return
    }

    batchMutation.mutate(
      { ids: Array.from(selectedIds), collectionStatus: "COLLECTED" },
      {
        onSuccess: (data) => {
          toast.success(`${data.updatedCount}건 수금 처리가 완료되었습니다`)
          handleOpenChange(false)
        },
        onError: () => {
          toast.error("수금 처리에 실패했습니다")
        },
      }
    )
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>일괄 수금 처리</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {storeName}의 미수금 내역을 선택하여 수금 처리합니다
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              미수금 내역이 없습니다
            </div>
          ) : (
            <>
              {/* 전체 선택 */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox
                  checked={records.length > 0 && selectedIds.size === records.length}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium text-gray-700">
                  전체 선택 ({selectedIds.size}/{records.length})
                </span>
              </div>

              {/* 레코드 목록 */}
              <div className="space-y-2">
                {records.map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(r.id)}
                      onCheckedChange={() => toggleId(r.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.date}</p>
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
            </>
          )}
        </div>

        <ResponsiveModalFooter>
          <Button
            onClick={handleSubmit}
            disabled={batchMutation.isPending || selectedIds.size === 0}
            className="w-full"
          >
            {batchMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            수금 처리 ({selectedIds.size}건, {selectedTotal.toLocaleString()}원)
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
