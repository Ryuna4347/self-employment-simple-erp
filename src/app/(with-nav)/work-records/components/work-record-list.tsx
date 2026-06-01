"use client";

import { useMemo, useState } from "react";
import { FileX } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { WorkRecordResponse } from "../hooks/use-work-records";
import type { Role } from "@/generated/prisma/client";
import { EmptyState } from "@/components/common/empty-state";
import { WorkRecordCard, SortableWorkRecordCard } from "./work-record-card";

interface WorkRecordListProps {
  records: WorkRecordResponse[];
  onEdit?: (record: WorkRecordResponse) => void;
  onDelete?: (id: string) => void;
  onCollect?: (id: string) => void;
  onRequestCollect?: (record: WorkRecordResponse) => void;
  userRole: Role;
  deletingId?: string | null;
  collectingId?: string | null;
  canReorder?: boolean;
  onReorder?: (records: { id: string; sortOrder: number }[]) => void;
}

/**
 * 근무 기록 리스트 컴포넌트
 * - 카드 목록 렌더링
 * - 빈 상태 처리
 * - 드래그앤드롭 순서 변경 (canReorder=true 시, 3초 롱프레스로 활성화)
 */
export function WorkRecordList({
  records,
  onEdit,
  onDelete,
  onCollect,
  onRequestCollect,
  userRole,
  deletingId,
  collectingId,
  canReorder = false,
  onReorder,
}: WorkRecordListProps) {
  // 드래그 정렬을 위한 로컬 상태
  const [localRecords, setLocalRecords] = useState(records);
  const [isDragging, setIsDragging] = useState(false);
  const [prevRecords, setPrevRecords] = useState(records);

  // 드래그 중이 아니면 records prop을 그대로 로컬 상태에 반영한다.
  // 수금 처리·수정·삭제 등으로 record의 내용만 바뀌고 id 목록(및 순서)은 그대로인 경우에도
  // 반드시 동기화되어야 카드가 최신 수금 상태를 표시한다.
  // 드래그 중에는 순서 보존을 위해 동기화를 건너뛰고, 드래그가 끝난 뒤 동기화한다.
  if (prevRecords !== records && !isDragging) {
    setPrevRecords(records);
    setLocalRecords(records);
  }

  // 1.5초 롱프레스로 드래그 활성화 (MouseSensor + TouchSensor 분리로 클릭 이벤트 정상 동작)
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { delay: 1000, tolerance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 1000, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localRecords.findIndex((r) => r.id === active.id);
      const newIndex = localRecords.findIndex((r) => r.id === over.id);
      const reordered = arrayMove(localRecords, oldIndex, newIndex);
      setLocalRecords(reordered);
      // 서버에 순서 저장 요청
      onReorder?.(reordered.map((r, i) => ({ id: r.id, sortOrder: i })));
    }
  };

  const cardProps = useMemo(
    () => ({
      onEdit,
      onDelete,
      onCollect,
      onRequestCollect,
      userRole,
    }),
    [onEdit, onDelete, onCollect, onRequestCollect, userRole],
  );

  if (localRecords.length === 0) {
    return (
      <EmptyState
        icon={FileX}
        title="등록된 근무 기록이 없습니다"
        description="우측 하단 + 버튼을 눌러 근무 기록을 추가하세요"
        variant="card"
      />
    );
  }

  // 드래그앤드롭 활성화 시
  if (canReorder) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={localRecords.map((r) => r.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {localRecords.map((record) => (
              <SortableWorkRecordCard
                key={record.id}
                record={record}
                {...cardProps}
                isDeleting={deletingId === record.id}
                isCollecting={collectingId === record.id}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    );
  }

  // 기본 렌더링 (드래그 비활성화)
  return (
    <div className="space-y-3">
      {localRecords.map((record) => (
        <WorkRecordCard
          key={record.id}
          record={record}
          {...cardProps}
          isDeleting={deletingId === record.id}
          isCollecting={collectingId === record.id}
        />
      ))}
    </div>
  );
}
