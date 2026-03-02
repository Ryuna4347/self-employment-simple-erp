"use client";

import { useState } from "react";
import { MapPin, ChevronDown, Pencil, Trash2, AlertTriangle, CircleCheck, ImageIcon, Loader2 } from "lucide-react";
import { StoreVisitHistory } from "./store-visit-history";
import { Button } from "@/components/ui/button";
import type { WorkRecordResponse, WorkRecordItem, CollectionStatus } from "../hooks/use-work-records";
import type { PaymentType } from "@/generated/prisma/client";
import { cn } from "@/lib/utils";

interface WorkRecordCardProps {
  record: WorkRecordResponse;
  onEdit?: (record: WorkRecordResponse) => void;
  onDelete?: (id: string) => void;
  onCollect?: (id: string) => void;
  userRole: "ADMIN" | "USER";
  isDeleting?: boolean;
  isCollecting?: boolean;
}

// 유틸리티 함수: 총 금액 계산
function calculateTotalAmount(items: WorkRecordItem[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

// 유틸리티 함수: 결제 방식 한글 변환
function formatPaymentType(type: PaymentType): string {
  const typeMap: Record<PaymentType, string> = {
    CASH: "현금",
    ACCOUNT: "계좌이체",
    CARD: "카드",
  };
  return typeMap[type];
}

// 수금 상태별 설정
const COLLECTION_STATUS_CONFIG: Record<CollectionStatus, { color: string; barColor: string; label: string }> = {
  COLLECTED: { color: "text-blue-600", barColor: "bg-blue-500", label: "수금 완료" },
  UNCOLLECTED: { color: "text-red-600", barColor: "bg-red-500", label: "미수금" },
  CLOSED: { color: "text-gray-600", barColor: "bg-gray-400", label: "휴업&폐업" },
};

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
export function WorkRecordCard({ record, onEdit, onDelete, onCollect, userRole, isDeleting, isCollecting }: WorkRecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalAmount = calculateTotalAmount(record.items);
  const statusConfig = COLLECTION_STATUS_CONFIG[record.collectionStatus];
  // 미수 상태가 아닌 기록은 관리자만 수정/삭제 가능
  const canModify = record.collectionStatus === "UNCOLLECTED" || userRole === "ADMIN";
  const isActionPending = isDeleting || isCollecting;

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

  const handleCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollect?.(record.id);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all flex",
        "hover:shadow-md"
      )}
    >
      {/* 수금 상태 컬러 바 - 전체 높이 */}
      <div
        className={cn("w-1.5 flex-shrink-0", statusConfig.barColor)}
        aria-label={statusConfig.label}
      />

      {/* 카드 콘텐츠 영역 */}
      <div className="flex-1">
        {/* 축약 모드 - 클릭 가능 영역 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left focus:outline-none p-4"
        >
          <div className="flex items-start justify-between gap-3">
            {/* 좌측: 매장 정보 (스냅샷 우선 사용) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-base truncate">
                  {record.storeNameSnapshot ?? record.store?.name ?? "알 수 없음"}
                </h3>
                {record.storeOutstanding && record.storeOutstanding.count > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0 whitespace-nowrap">
                    <AlertTriangle className="size-3" />
                    미수 {record.storeOutstanding.count}건 {record.storeOutstanding.totalAmount.toLocaleString()}원
                  </span>
                )}
              </div>
              <div className="flex items-start gap-1.5 text-sm text-gray-600">
                <MapPin className="size-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">
                  {record.storeAddressSnapshot ?? record.store?.address ?? "주소 없음"}
                </span>
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
                  "size-5 text-gray-400 transition-transform duration-300",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>
        </button>

        {/* 상세 모드 - 확장 영역 (애니메이션) */}
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
                    {formatPaymentType(record.paymentTypeSnapshot)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">수금상태</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={cn("font-medium", statusConfig.color)}>
                      {statusConfig.label}
                    </p>
                    {record.collectionStatus === "UNCOLLECTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCollect}
                        disabled={isActionPending}
                        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        {isCollecting ? <Loader2 className="size-3 animate-spin" /> : <CircleCheck className="size-3" />}
                        {isCollecting ? "처리 중..." : "수금처리"}
                      </Button>
                    )}
                  </div>
                </div>
                {(record.managerNameSnapshot ?? record.store?.managerName) && (
                  <div className="col-span-2">
                    <span className="text-gray-600">담당자</span>
                    <p className="font-medium text-gray-900 mt-0.5">
                      {record.managerNameSnapshot ?? record.store?.managerName}
                    </p>
                  </div>
                )}
              </div>

              {/* 품목 리스트 */}
              {record.collectionStatus === "CLOSED" ? (
                <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  휴업&폐업 상태에서는 거래 품목이 없습니다
                </div>
              ) : (
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
                            수량
                          </th>
                          <th className="px-3 py-2 text-right text-gray-700 font-medium">
                            금액
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {record.items.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-900">{item.name}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {item.amount.toLocaleString()}원
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                        <tr>
                          <td
                            colSpan={2}
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
              )}

              {/* 방문 이력 (최근 6개월) */}
              {record.storeId && (
                <StoreVisitHistory
                  storeId={record.storeId}
                  currentDate={record.date}
                  isExpanded={isExpanded}
                />
              )}

              {/* 첨부 이미지 (휴업&폐업일 때만) */}
              {record.collectionStatus === "CLOSED" && record.imageUrl && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                    <ImageIcon className="size-4" />
                    첨부 이미지
                  </h4>
                  <a href={record.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={record.imageUrl}
                      alt="첨부 이미지"
                      className="rounded-lg border border-gray-200 max-h-48 object-contain"
                    />
                  </a>
                </div>
              )}

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
              {canModify ? (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    disabled={isActionPending}
                    className="flex-1"
                  >
                    <Pencil className="size-4" />
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isActionPending}
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {isDeleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    {isDeleting ? "삭제 중..." : "삭제"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center pt-2">
                  미수 상태가 아닌 기록은 관리자만 수정할 수 있습니다
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
