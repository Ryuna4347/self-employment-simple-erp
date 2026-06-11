"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  MapPin,
  ChevronDown,
  Pencil,
  Trash2,
  ImageIcon,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { StoreVisitHistory } from "./store-visit-history";
import { OutstandingBadge } from "./outstanding-badge";
import { CollectAction } from "./collect-action";
import { RecordItemsTable } from "./record-items-table";
import { Button } from "@/components/ui/button";
import type {
  WorkRecordResponse,
  CollectionStatus,
} from "../hooks/use-work-records";
import type { PaymentType, Role } from "@/generated/prisma/client";
import { canWrite } from "@/lib/role-utils";
import { calcTotalAmount } from "@/lib/collection-utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface WorkRecordCardProps {
  record: WorkRecordResponse;
  onEdit?: (record: WorkRecordResponse) => void;
  onDelete?: (id: string) => void;
  onCollect?: (id: string) => void;
  onRequestCollect?: (record: WorkRecordResponse) => void;
  userRole: Role;
  isDeleting?: boolean;
  isCollecting?: boolean;
  isDragging?: boolean;
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

// 결제 방식별 색상 설정
export const PAYMENT_TYPE_CONFIG: Record<
  PaymentType,
  { color: string; label: string }
> = {
  CASH: { color: "text-green-600", label: "현금" },
  ACCOUNT: { color: "text-violet-600", label: "계좌이체" },
  CARD: { color: "text-orange-500", label: "카드" },
};

// 수금 상태별 설정
const COLLECTION_STATUS_CONFIG: Record<
  CollectionStatus,
  { color: string; barColor: string; label: string }
> = {
  COLLECTED: {
    color: "text-blue-600",
    barColor: "bg-blue-500",
    label: "수금 완료",
  },
  UNCOLLECTED: {
    color: "text-red-600",
    barColor: "bg-red-500",
    label: "미수금",
  },
  CLOSED: {
    color: "text-gray-600",
    barColor: "bg-gray-400",
    label: "휴업&폐업",
  },
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
export const WorkRecordCard = React.memo(function WorkRecordCard({
  record,
  onEdit,
  onDelete,
  onCollect,
  onRequestCollect,
  userRole,
  isDeleting,
  isCollecting,
  isDragging,
}: WorkRecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const totalAmount = useMemo(
    () => calcTotalAmount(record.items),
    [record.items],
  );
  const statusConfig = COLLECTION_STATUS_CONFIG[record.collectionStatus];
  // 미수 상태가 아닌 기록은 관리자만 수정/삭제 가능, VIEWER는 수정 불가
  const canModify =
    (record.collectionStatus === "UNCOLLECTED" || userRole === "ADMIN") && canWrite(userRole);
  const isActionPending = isDeleting || isCollecting;
  const storeAddress = record.storeAddressSnapshot ?? record.store?.address ?? "";
  const storeAddressLabel = storeAddress || "주소 없음";

  const toggleExpand = useCallback(() => {
    setIsExpanded((v) => !v);
  }, []);

  const handleToggleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleExpand();
      }
    },
    [toggleExpand],
  );

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
        "bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all flex",
        "hover:shadow-md",
        isDragging && "opacity-50 shadow-lg border-blue-400 scale-[1.02]",
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
        <div
          role="button"
          tabIndex={0}
          onClick={toggleExpand}
          onKeyDown={handleToggleKeyDown}
          className="w-full text-left focus:outline-none p-4 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            {/* 좌측: 매장 정보 (스냅샷 우선 사용) */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 text-base truncate">
                  {record.storeNameSnapshot ??
                    record.store?.name ??
                    "알 수 없음"}
                </h3>
                <OutstandingBadge
                  storeOutstanding={record.storeOutstanding}
                  storeNote={record.store?.note}
                />
              </div>
              <button
                type="button"
                aria-label={`주소 복사: ${storeAddressLabel}`}
                className="flex items-start gap-1.5 text-sm text-gray-600 active:bg-gray-100 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  if (storeAddress) {
                    navigator.clipboard.writeText(storeAddress);
                    toast.success("주소가 복사되었습니다");
                  }
                }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <MapPin className="size-4 flex-shrink-0 mt-0.5" />
                <span className="line-clamp-1">
                  {record.storeAddressSnapshot ??
                    record.store?.address ??
                    "주소 없음"}
                </span>
              </button>
            </div>

            {/* 우측: 금액 및 확장 아이콘 */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-sm text-gray-500">합계</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    PAYMENT_TYPE_CONFIG[record.paymentTypeSnapshot].color,
                  )}
                >
                  {totalAmount.toLocaleString()}원
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "size-5 text-gray-400 transition-transform duration-300",
                  isExpanded && "rotate-180",
                )}
              />
            </div>
          </div>
        </div>

        {/* 상세 모드 - 확장 영역 (애니메이션) */}
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-out",
            isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
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
                      {record.collectionStatus === "COLLECTED" &&
                        record.collectedAt && (
                          <span className="text-gray-500 font-normal text-xs ml-1">
                            ({record.collectedBy?.name ?? "알 수 없음"}/{" "}
                            {new Date(record.collectedAt).toLocaleDateString(
                              "ko-KR",
                            )}
                            )
                          </span>
                        )}
                    </p>
                    <CollectAction
                      record={record}
                      userRole={userRole}
                      isActionPending={!!isActionPending}
                      isCollecting={isCollecting}
                      onCollect={onCollect}
                      onRequestCollect={onRequestCollect}
                    />
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
                <RecordItemsTable items={record.items} totalAmount={totalAmount} />
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
                  <a
                    href={record.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    메모
                  </h4>
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
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
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
})

WorkRecordCard.displayName = "WorkRecordCard"

/**
 * 드래그앤드롭 정렬을 위한 래퍼 컴포넌트
 * - useSortable 훅으로 드래그 기능 연결
 * - 드래그 중 시각적 피드백 (isDragging)
 */
export function SortableWorkRecordCard(props: WorkRecordCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.record.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <WorkRecordCard {...props} isDragging={isDragging} />
    </div>
  );
}
