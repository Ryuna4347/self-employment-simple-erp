"use client";

import { FileX } from "lucide-react";
import type { WorkRecordResponse } from "../hooks/use-work-records";
import { WorkRecordCard } from "./work-record-card";

interface WorkRecordListProps {
  records: WorkRecordResponse[];
  onEdit?: (record: WorkRecordResponse) => void;
  onDelete?: (id: string) => void;
}

/**
 * 근무 기록 리스트 컴포넌트
 * - 카드 목록 렌더링
 * - 빈 상태 처리
 */
export function WorkRecordList({ records, onEdit, onDelete }: WorkRecordListProps) {
  if (records.length === 0) {
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

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <WorkRecordCard
          key={record.id}
          record={record}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
