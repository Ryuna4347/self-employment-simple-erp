"use client";

import { useState } from "react";
import { Plus, PenLine, FileText, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FabMenuProps {
  onAddRecord: () => void;
  onApplyTemplate: () => void;
  onBulkDelete: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  hasRecords: boolean;
}

/**
 * Floating Action Button 메뉴 컴포넌트
 * - 근무 기록 추가
 * - 코스 적용
 */
export function FabMenu({ onAddRecord, onApplyTemplate, onBulkDelete, onRefresh, isRefreshing, hasRecords }: FabMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleAddRecord = () => {
    setIsOpen(false);
    onAddRecord();
  };

  const handleApplyTemplate = () => {
    setIsOpen(false);
    onApplyTemplate();
  };

  const handleBulkDelete = () => {
    setIsOpen(false);
    onBulkDelete();
  };

  return (
    <>
      {/* 백드롭 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 transition-opacity"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 메뉴 아이템 (하단 네비 위에 표시) */}
      {isOpen && (
        <div className="fixed bottom-[10rem] right-6 z-50 flex flex-col gap-3">
          {/* 코스 적용 */}
          <button
            onClick={handleApplyTemplate}
            className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <FileText className="size-5" />
            <span className="pr-2 font-medium">코스 적용</span>
          </button>

          {/* 근무 기록 추가 */}
          <button
            onClick={handleAddRecord}
            className="flex items-center gap-3 bg-white text-gray-700 px-4 py-3 rounded-full shadow-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <PenLine className="size-5" />
            <span className="pr-2 font-medium">근무 기록 추가</span>
          </button>
        </div>
      )}

      {/* 전체 삭제 버튼 (FAB과 새로고침 사이, 목록이 있을 때만) */}
      {!isOpen && hasRecords && (
        <button
          onClick={handleBulkDelete}
          className="fixed bottom-[9.5rem] right-7 size-12 rounded-full shadow-md transition-all z-40 flex items-center justify-center bg-white text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          aria-label="전체 삭제"
        >
          <Trash2 className="size-5" />
        </button>
      )}

      {/* 새로고침 버튼 */}
      {!isOpen && (
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={cn(
            "fixed right-7 size-12 rounded-full shadow-md transition-all z-40 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
            hasRecords ? "bottom-52" : "bottom-[9.5rem]",
          )}
          aria-label="새로고침"
        >
          <RefreshCw className={`size-5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
      )}

      {/* FAB 버튼 (하단 네비 위에 배치: bottom-nav 높이 ~5rem + 여백 0.75rem) */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
          isOpen
            ? "bg-gray-500 hover:bg-gray-600 text-white"
            : "bg-primary hover:bg-primary/90 text-primary-foreground",
        )}
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
      >
        <Plus
          className={cn(
            "size-6 transition-transform duration-200",
            isOpen && "rotate-45",
          )}
        />
      </button>
    </>
  );
}
