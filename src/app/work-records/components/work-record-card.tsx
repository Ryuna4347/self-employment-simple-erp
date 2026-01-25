"use client";

import { useState } from "react";
import { MapPin, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkRecord, calculateTotalAmount, formatPaymentType } from "../types";
import { cn } from "@/lib/utils";

interface WorkRecordCardProps {
  record: WorkRecord;
  onEdit?: (record: WorkRecord) => void;
  onDelete?: (id: string) => void;
}

/**
 * 근무 기록 카드 컴포넌트 (Accordion)
 *
 * 축약 모드 (기본):
 * - 매장명, 주소
 * - 수금 상태 컬러 바 (좌측)
 * - 총 금액
 *
 * 상세 모드 (클릭 시 확장):
 * - 결제 방식
 * - 품목 리스트 (테이블)
 * - 메모
 * - 수정/삭제 버튼
 */
export function WorkRecordCard({ record, onEdit, onDelete }: WorkRecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalAmount = calculateTotalAmount(record.items);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(record);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("정말로 이 근무 기록을 삭제하시겠습니까?")) {
      onDelete?.(record.id);
    }
  };

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
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
      >
        <div className="flex">
          {/* 수금 상태 컬러 바 */}
          <div
            className={cn(
              "w-1.5 flex-shrink-0",
              record.isCollected ? "bg-blue-500" : "bg-red-500"
            )}
            aria-label={record.isCollected ? "수금 완료" : "미수금"}
          />

          {/* 카드 내용 */}
          <div className="flex-1 p-4">
            <div className="flex items-start justify-between gap-3">
              {/* 좌측: 매장 정보 */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-base mb-1">
                  {record.store.name}
                </h3>
                <div className="flex items-start gap-1.5 text-sm text-gray-600">
                  <MapPin className="size-4 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{record.store.address}</span>
                </div>
              </div>

              {/* 우측: 금액 및 확장 아이콘 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm text-gray-500">합계</p>
                  <p className="text-lg font-bold text-gray-900">
                    {totalAmount.toLocaleString()}원
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    "size-5 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </button>

      {/* 상세 모드 - 확장 영역 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">결제방식</span>
              <p className="font-medium text-gray-900 mt-0.5">
                {formatPaymentType(record.paymentTypeSnapshot)}
              </p>
            </div>
            <div>
              <span className="text-gray-600">수금상태</span>
              <p
                className={cn(
                  "font-medium mt-0.5",
                  record.isCollected ? "text-blue-600" : "text-red-600"
                )}
              >
                {record.isCollected ? "수금 완료" : "미수금"}
              </p>
            </div>
            {record.store.managerName && (
              <div className="col-span-2">
                <span className="text-gray-600">담당자</span>
                <p className="font-medium text-gray-900 mt-0.5">
                  {record.store.managerName}
                </p>
              </div>
            )}
          </div>

          {/* 품목 리스트 */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">거래 품목</h4>
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
                      수량
                    </th>
                    <th className="px-3 py-2 text-right text-gray-700 font-medium">
                      소계
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {record.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.unitPrice.toLocaleString()}원
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {(item.unitPrice * item.quantity).toLocaleString()}원
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-2 text-right font-semibold text-gray-900"
                    >
                      합계
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                      {totalAmount.toLocaleString()}원
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 메모 */}
          {record.note && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">메모</h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {record.note}
              </p>
            </div>
          )}

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
      )}
    </div>
  );
}
