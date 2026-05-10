"use client"

import { useMemo } from "react"
import { format, subDays } from "date-fns"
import { Loader2 } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { useDailyCashCollection } from "../hooks/use-daily-cash-collection"

interface DailyCashCollectionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseDate: Date
}

export function DailyCashCollectionModal({
  open,
  onOpenChange,
  baseDate,
}: DailyCashCollectionModalProps) {
  const targetDate = useMemo(() => format(subDays(baseDate, 1), "yyyy-MM-dd"), [baseDate])
  const { data, isLoading, error } = useDailyCashCollection(targetDate, { enabled: open })

  const displayDate = data?.isoDate ?? targetDate
  const displayLabel = data?.dateLabel ? `${data.dateLabel} ` : ""

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{displayLabel}직원별 현금 수금</ResponsiveModalTitle>
          <p className="text-xs text-gray-500 mt-1">{displayDate} (KST)</p>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-1 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-500">
              데이터를 불러오지 못했습니다
            </div>
          ) : !data || data.rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              전날 현금 수금 내역이 없습니다.
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-md border border-gray-200">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-gray-50 px-4 py-2 text-xs font-medium text-gray-500">
                  <span>직원</span>
                  <span className="text-right">건수</span>
                  <span className="text-right">금액</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {data.rows.map((row) => (
                    <div
                      key={row.userId}
                      className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 text-sm font-medium text-gray-900 truncate">
                        {row.name}
                      </div>
                      <div className="text-right text-sm text-gray-500">{row.recordCount}건</div>
                      <div className="text-right text-sm font-semibold text-gray-900">
                        {row.totalAmount.toLocaleString("ko-KR")}원
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-gray-200 px-4 py-3">
                <span className="text-sm font-semibold text-gray-700">합계</span>
                <span className="text-base font-bold text-gray-900">
                  {data.grandTotal.toLocaleString("ko-KR")}원
                </span>
              </div>
            </>
          )}
        </div>

        <ResponsiveModalFooter className="pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
