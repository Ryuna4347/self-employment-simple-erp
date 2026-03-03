"use client"

import { Loader2 } from "lucide-react"
import type { PaymentType } from "@/generated/prisma/client"
import type { CollectionStatus } from "@/app/(with-nav)/work-records/hooks/use-work-records"
import { Button } from "@/components/ui/button"

// 지불방식 한글 라벨
const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  CASH: "현금",
  ACCOUNT: "계좌이체",
  CARD: "카드",
}

export interface StoreGroupRecord {
  id: string
  date: string
  totalAmount: number
  collectionStatus: CollectionStatus
  collectedAt: string | null
  collectedByName: string | null
}

export interface StoreGroup {
  storeName: string
  storeAddress: string | null
  paymentType: PaymentType
  managerName: string | null
  records: StoreGroupRecord[]
  totalAmount: number
}

interface StoreOutstandingCardProps {
  group: StoreGroup
  onToggle: (id: string, newCollectionStatus: CollectionStatus) => void
  onBatchCollect: (ids: string[]) => void
  togglingId: string | null
  isBatchToggling: boolean
}

/**
 * 매장별 미수금 그룹 카드 컴포넌트
 *
 * 동일 매장의 미수금 레코드를 묶어서 표시한다.
 * 날짜별 금액 목록과 합계, 일괄 수금처리 버튼을 제공한다.
 */
export function StoreOutstandingCard({
  group,
  onToggle,
  onBatchCollect,
  togglingId,
  isBatchToggling,
}: StoreOutstandingCardProps) {
  const allCollected = group.records.every((r) => r.collectionStatus === "COLLECTED")
  const uncollectedIds = group.records
    .filter((r) => r.collectionStatus === "UNCOLLECTED")
    .map((r) => r.id)

  return (
    <div
      className={`rounded-lg shadow-sm p-4 border-l-4 ${
        allCollected
          ? "border-blue-500 bg-blue-50"
          : "border-red-500 bg-white"
      }`}
    >
      {/* Row 1: 매장명 + 지불방식 뱃지 */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">
          {group.storeName}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {PAYMENT_TYPE_LABELS[group.paymentType]}
        </span>
      </div>

      {/* Row 2: 주소 + 담당자 */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-sm text-gray-600">
          {group.storeAddress ?? "-"}
        </p>
        {group.paymentType === "ACCOUNT" && group.managerName && (
          <span className="text-xs text-gray-500 shrink-0 ml-2">
            담당: {group.managerName}
          </span>
        )}
      </div>

      {/* 날짜별 미수금 목록 */}
      <div className="mt-3 space-y-1.5">
        {group.records.map((record) => {
          const isCollected = record.collectionStatus === "COLLECTED"
          return (
            <div
              key={record.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-600">{record.date}</span>
              <div className="flex items-center gap-2">
                <span
                  className={
                    isCollected
                      ? "text-blue-600 line-through"
                      : "text-gray-900"
                  }
                >
                  {record.totalAmount.toLocaleString()}원
                </span>
                {isCollected && record.collectedAt && (
                  <span className="text-xs text-blue-400">
                    ({record.collectedByName})
                  </span>
                )}
                <button
                  type="button"
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isCollected
                      ? "text-blue-600 hover:bg-blue-100"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                  disabled={togglingId === record.id}
                  onClick={() => onToggle(record.id, isCollected ? "UNCOLLECTED" : "COLLECTED")}
                >
                  {togglingId === record.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : isCollected ? (
                    "취소"
                  ) : (
                    "수금"
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 구분선 + 합계 + 일괄 수금처리 */}
      <div className="border-t mt-3 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-600">미수금 합계</span>
            <span
              className={`ml-2 font-semibold ${
                allCollected ? "text-blue-600 line-through" : "text-red-600"
              }`}
            >
              {group.totalAmount.toLocaleString()}원
            </span>
          </div>
          {uncollectedIds.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={isBatchToggling}
              onClick={() => onBatchCollect(uncollectedIds)}
            >
              {isBatchToggling && <Loader2 className="size-4 animate-spin" />}
              일괄 수금처리
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
