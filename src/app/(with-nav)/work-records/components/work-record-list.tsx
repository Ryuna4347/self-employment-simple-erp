"use client";

import { useState, useEffect } from "react";
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
import { WorkRecordCard, SortableWorkRecordCard } from "./work-record-card";

interface WorkRecordListProps {
  records: WorkRecordResponse[];
  onEdit?: (record: WorkRecordResponse) => void;
  onDelete?: (id: string) => void;
  onCollect?: (id: string) => void;
  onRequestCollect?: (record: WorkRecordResponse) => void;
  userRole: "ADMIN" | "USER";
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
  // 낙관적 업데이트를 위한 로컬 상태
  const [localRecords, setLocalRecords] = useState(records);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

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

  const handleDragEnd = (event: DragEndEvent) => {
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

  if (localRecords.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <FileX className="size-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-base font-medium">
          등록된 근무 기록이 없습니다
        </p>
        <p className="text-gray-400 text-sm mt-1">
          우측 하단 + 버튼을 눌러 근무 기록을 추가하세요
        </p>
      </div>
    );
  }

  const cardProps = {
    onEdit,
    onDelete,
    onCollect,
    onRequestCollect,
    userRole,
  };

  // 드래그앤드롭 활성화 시
  if (canReorder) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
