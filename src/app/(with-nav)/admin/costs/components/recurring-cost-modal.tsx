"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { useRecurringCosts } from "../hooks/use-recurring-costs";
import { RecurringCostCard } from "./recurring-cost-card";

interface RecurringCostModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringCostModal({
  open,
  onOpenChange,
}: RecurringCostModalProps) {
  const { data: costs, isLoading, isError } = useRecurringCosts();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditingId(null);
      setIsCreating(false);
    }
    onOpenChange(newOpen);
  };

  const handleEditRequest = (id: string) => {
    setIsCreating(false);
    setEditingId(id);
  };

  const handleStartCreate = () => {
    setEditingId(null);
    setIsCreating(true);
  };

  const handleSaved = () => {
    setEditingId(null);
    setIsCreating(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleCancelCreate = () => {
    setIsCreating(false);
  };

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      mobileVariant="fullscreen"
    >
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>고정비용 관리</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            주기적으로 반복되는 고정 비용을 관리합니다
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="px-4 sm:px-1 pb-2">
          <Button
            size="sm"
            className="w-full"
            onClick={handleStartCreate}
            disabled={isCreating}
          >
            <Plus className="size-4" />
            추가
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-1 pb-4">
          {/* 로딩 */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* 에러 */}
          {isError && (
            <div className="flex items-center justify-center py-12">
              <p className="text-destructive text-sm">
                데이터를 불러오는 중 오류가 발생했습니다.
              </p>
            </div>
          )}

          {/* 카드 목록 */}
          {costs && (
            <div className="space-y-3">
              {costs.length === 0 && !isCreating && (
                <div className="text-center py-12 text-sm text-gray-400">
                  등록된 고정비용이 없습니다
                </div>
              )}

              {costs.map((cost) => (
                <RecurringCostCard
                  key={cost.id}
                  mode={editingId === cost.id ? "edit" : "view"}
                  cost={cost}
                  onCancel={handleCancelEdit}
                  onSaved={handleSaved}
                  onEditRequest={() => handleEditRequest(cost.id)}
                />
              ))}

              {/* 새 카드 생성 */}
              {isCreating && (
                <RecurringCostCard
                  mode="create"
                  onCancel={handleCancelCreate}
                  onSaved={handleSaved}
                  onEditRequest={() => {}}
                />
              )}
            </div>
          )}
        </div>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
}
