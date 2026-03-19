"use client"

import { Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PaymentType } from "@/generated/prisma/client"
import type { CollectionStatus } from "@/app/(with-nav)/work-records/hooks/use-work-records"

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
  storeId: string | null
  storeAddress: string | null
  paymentType: PaymentType
  managerName: string | null
  records: StoreGroupRecord[]
  totalAmount: number
}

interface StoreOutstandingCardProps {
  group: StoreGroup
  onCollect?: (group: StoreGroup) => void
}

/**
 * 매장별 미수금 그룹 카드 컴포넌트 (조회 전용)
 *
 * 동일 매장의 미수금 레코드를 묶어서 표시한다.
 */
export function StoreOutstandingCard({ group, onCollect }: StoreOutstandingCardProps) {
  return (
    <div className="rounded-lg shadow-sm p-4 border-l-4 border-red-500 bg-white">
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
        {group.records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-600">{record.date}</span>
            <span className="text-gray-900">
              {record.totalAmount.toLocaleString()}원
            </span>
          </div>
        ))}
      </div>

      {/* 구분선 + 합계 + 수금처리 버튼 */}
      <div className="border-t mt-3 pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">미수금 합계</span>
          <span className="font-semibold text-red-600">
            {group.totalAmount.toLocaleString()}원
          </span>
        </div>
        {onCollect && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3"
            onClick={() => onCollect(group)}
          >
            <Banknote className="size-4" />
            수금처리
          </Button>
        )}
      </div>
    </div>
  )
}
