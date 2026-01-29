"use client"

import { useState } from "react"
import { MapPin, ChevronDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Store } from "../hooks/use-stores"

interface StoreCardProps {
  store: Store
  onEdit: (store: Store) => void
  onDelete: (id: string) => void
}

const paymentTypeLabels: Record<string, string> = {
  CASH: "현금",
  ACCOUNT: "계좌",
  CARD: "카드",
}

/**
 * 매장 카드 컴포넌트 (Accordion)
 *
 * 축약 모드 (기본):
 * - 매장명 + (현금일 때 담당자 뱃지)
 * - 주소
 *
 * 상세 모드 (클릭 시 확장):
 * - 결제방식
 * - 담당자
 * - 품목 테이블
 * - 수정/삭제 버튼
 */
export function StoreCard({ store, onEdit, onDelete }: StoreCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit(store)
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("정말로 이 매장을 삭제하시겠습니까?")) {
      onDelete(store.id)
    }
  }

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all",
        "hover:shadow-md"
      )}
    >
      {/* 축약 모드 - 클릭 가능 영역 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left focus:outline-none p-4"
      >
        <div className="flex items-start justify-between gap-3">
          {/* 좌측: 매장 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 text-base">
                {store.name}
              </h3>
              {store.PaymentType === "CASH" && store.managerName && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                  {store.managerName}
                </span>
              )}
            </div>
            <div className="flex items-start gap-1.5 text-sm text-gray-600">
              <MapPin className="size-4 flex-shrink-0 mt-0.5" />
              <span className="line-clamp-1">{store.address}</span>
            </div>
          </div>

          {/* 우측: 확장 아이콘 */}
          <ChevronDown
            className={cn(
              "size-5 text-gray-400 transition-transform duration-300 flex-shrink-0",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* 상세 모드 - 확장 영역 (grid-rows 애니메이션) */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-gray-200 p-4 space-y-4">
            {/* 기본 정보 */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-600">결제방식</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {paymentTypeLabels[store.PaymentType]}
                </p>
              </div>
              {store.managerName && (
                <div>
                  <span className="text-gray-600">담당자 (입금자)</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {store.managerName}
                  </p>
                </div>
              )}
            </div>

            {/* 품목 테이블 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                매장 기본 품목
              </h4>
              {store.storeItems.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700 font-medium">
                          품명
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 font-medium">
                          단가
                        </th>
                        <th className="px-3 py-2 text-right text-gray-700 font-medium">
                          기본 수량
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {store.storeItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-900">
                            {item.name}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {item.unitPrice.toLocaleString()}원
                          </td>
                          <td className="px-3 py-2 text-right text-gray-700">
                            {item.quantity}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg text-gray-400 text-sm">
                  등록된 기본 품목이 없습니다
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="flex-1"
              >
                <Pencil className="size-4" />
                수정
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="size-4" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
