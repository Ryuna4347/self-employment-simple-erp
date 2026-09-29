"use client";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { cn } from "@/lib/utils";

/** 목록에 표시할 매장 (date: 제거일 또는 추가일) */
export interface StoreListItem {
  id: string;
  name: string;
  address: string;
  date: string;
}

interface StoreListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  stores: StoreListItem[];
  /** deleted: 제거된 매장(회색), added: 추가된 매장(초록) */
  variant: "deleted" | "added";
}

/**
 * 대시보드 제거/추가 매장 전체 목록 모달 ("더보기")
 *
 * dashboard-content에서 next/dynamic으로 지연 로드한다 (모달·Drawer 코드를 대시보드 초기 번들에서 제외).
 */
export function StoreListModal({
  open,
  onOpenChange,
  title,
  stores,
  variant,
}: StoreListModalProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent className="sm:max-w-md">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
        </ResponsiveModalHeader>
        <div className="px-4 sm:px-6 pb-4 flex-1 min-h-0 overflow-y-auto space-y-2 sm:flex-none sm:max-h-[60vh]">
          {stores.map((store) => (
            <div
              key={store.id}
              className={cn(
                "flex items-center justify-between p-3 rounded border-l-4",
                variant === "deleted"
                  ? "bg-gray-50 border-gray-400"
                  : "bg-emerald-50 border-emerald-500",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {store.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {store.address}
                </p>
              </div>
              <span className="text-xs text-gray-500 ml-3 shrink-0">
                {store.date}
              </span>
            </div>
          ))}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
