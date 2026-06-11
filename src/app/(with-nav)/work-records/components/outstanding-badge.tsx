"use client";

import { AlertTriangle } from "lucide-react";
import type { StoreOutstanding } from "../hooks/use-work-records";

interface OutstandingBadgeProps {
  storeOutstanding: StoreOutstanding | null | undefined;
  storeNote: string | null | undefined;
}

/**
 * 매장명 옆 미수 배지 2종
 * - 해당 매장의 다른 날짜 미수 집계 배지 (amber)
 * - 매장 특이사항의 "미수 NNN원" 패턴 배지 (orange, 전 미수)
 */
export function OutstandingBadge({
  storeOutstanding,
  storeNote,
}: OutstandingBadgeProps) {
  const noteMatch = storeNote?.match(/^미수\s+([\d,]+)\s*원?/);

  return (
    <>
      {storeOutstanding && storeOutstanding.count > 0 && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-amber-100 text-amber-700 border border-amber-300 flex-shrink-0 whitespace-nowrap"
          style={{ fontSize: "13px" }}
        >
          <AlertTriangle className="size-3" />
          미수 {storeOutstanding.count}건{" "}
          {storeOutstanding.totalAmount.toLocaleString()}원
        </span>
      )}
      {noteMatch && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-medium bg-orange-100 text-orange-700 border border-orange-300 flex-shrink-0 whitespace-nowrap"
          style={{ fontSize: "13px" }}
        >
          전 미수: {Number(noteMatch[1].replace(/,/g, "")).toLocaleString()}원
        </span>
      )}
    </>
  );
}
