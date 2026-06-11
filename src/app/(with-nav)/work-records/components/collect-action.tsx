"use client";

import React from "react";
import { CircleCheck, Clock, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkRecordResponse } from "../hooks/use-work-records";
import type { Role } from "@/generated/prisma/client";

interface CollectActionProps {
  record: WorkRecordResponse;
  userRole: Role;
  isActionPending: boolean;
  isCollecting?: boolean;
  onCollect?: (id: string) => void;
  onRequestCollect?: (record: WorkRecordResponse) => void;
}

/**
 * 미수 기록의 수금 액션 (4분기) — 회귀가 잦은 로직이라 단독 컴포넌트로 격리
 * 1. PENDING 요청 있음 → "수금 확인 요청 중" 표시
 * 2. 다른 날짜 미수 있음 → 일괄 처리 모달 (ADMIN: 일괄 수금처리 / USER: 수금 확인 요청)
 * 3. 직접 수금 가능(24시간 이내) 또는 ADMIN → 단건 수금처리
 * 4. 기한 초과 → 수금 확인 요청
 */
export function CollectAction({
  record,
  userRole,
  isActionPending,
  isCollecting,
  onCollect,
  onRequestCollect,
}: CollectActionProps) {
  if (record.collectionStatus !== "UNCOLLECTED") return null;

  const handleCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCollect?.(record.id);
  };

  const handleRequestCollect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRequestCollect?.(record);
  };

  if (record.hasPendingRequest) {
    return (
      <span className="inline-flex items-center gap-1 h-6 px-2 text-xs text-amber-600">
        <Clock className="size-3" />
        수금 확인 요청 중
      </span>
    );
  }

  if (record.hasPreviousUncollected) {
    // 다른 날짜 미수건이 있으면 모달로 일괄 처리
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleRequestCollect}
        disabled={isActionPending}
        className={
          userRole === "ADMIN"
            ? "h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            : "h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        }
      >
        {userRole === "ADMIN" ? (
          <>
            <CircleCheck className="size-3" />
            일괄 수금처리
          </>
        ) : (
          <>
            <Send className="size-3" />
            수금 확인 요청
          </>
        )}
      </Button>
    );
  }

  if (record.canDirectCollect || userRole === "ADMIN") {
    // 이전 미수 없음 → 바로 단건 수금
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleCollect}
        disabled={isActionPending}
        className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
      >
        {isCollecting ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CircleCheck className="size-3" />
        )}
        {isCollecting ? "처리 중..." : "수금처리"}
      </Button>
    );
  }

  // 기한 초과 → 수금 확인 요청
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRequestCollect}
      disabled={isActionPending}
      className="h-6 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
    >
      <Send className="size-3" />
      수금 확인 요청
    </Button>
  );
}
