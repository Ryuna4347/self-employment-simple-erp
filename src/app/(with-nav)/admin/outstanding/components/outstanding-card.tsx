"use client"

import { Loader2 } from "lucide-react"
import type { PaymentType } from "@/generated/prisma/client"
import { Button } from "@/components/ui/button"

// 지불방식 한글 라벨
const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  CASH: "현금",
  ACCOUNT: "계좌이체",
  CARD: "카드",
}

export interface OutstandingRecord {
  id: string
  date: string
  storeNameSnapshot: string | null
  storeAddressSnapshot: string | null
  managerNameSnapshot: string | null
  paymentTypeSnapshot: PaymentType
  isCollected: boolean
  totalAmount: number
  userName: string
}

interface OutstandingCardProps {
  record: OutstandingRecord
  onToggle: (id: string, newIsCollected: boolean) => void
  isToggling: boolean
}

/**
 * 미수금 카드 컴포넌트
 *
 * 개별 미수금 레코드를 카드 형태로 표시한다.
 * 수금 완료/미수 상태에 따라 좌측 색상 바와 배경색이 변경된다.
 */
export function OutstandingCard({ record, onToggle, isToggling }: OutstandingCardProps) {
  const isCollected = record.isCollected

  return (
    <div
      className={`rounded-lg shadow-sm p-4 border-l-4 ${
        isCollected
          ? "border-blue-500 bg-blue-50"
          : "border-red-500 bg-white"
      }`}
    >
      {/* Row 1: 가게명 + 날짜 */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">
          {record.storeNameSnapshot ?? "-"}
        </span>
        <span className="text-xs text-gray-500">{record.date}</span>
      </div>

      {/* Row 2: 주소 */}
      <p className="text-sm text-gray-600 mt-1">
        {record.storeAddressSnapshot ?? "-"}
      </p>

      {/* Row 3: 지불방식 뱃지 + 담당자 */}
      <div className="flex items-center gap-2 mt-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
          {PAYMENT_TYPE_LABELS[record.paymentTypeSnapshot]}
        </span>
        {record.paymentTypeSnapshot === "ACCOUNT" && record.managerNameSnapshot && (
          <span className="text-xs text-gray-500">
            담당: {record.managerNameSnapshot}
          </span>
        )}
      </div>

      {/* Row 4: 금액 + 토글 버튼 */}
      <div className="flex items-center justify-between mt-3">
        <span
          className={
            isCollected
              ? "text-blue-600 font-semibold line-through"
              : "text-red-600 font-semibold"
          }
        >
          {record.totalAmount.toLocaleString()}원
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={isToggling}
          className={
            isCollected
              ? "border-blue-300 text-blue-600 hover:bg-blue-100"
              : ""
          }
          onClick={() => onToggle(record.id, !isCollected)}
        >
          {isToggling && <Loader2 className="size-4 animate-spin" />}
          {isCollected ? "미수 처리" : "수금완료"}
        </Button>
      </div>
    </div>
  )
}
