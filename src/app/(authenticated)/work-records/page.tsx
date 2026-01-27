"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarHeader } from "./components/calendar-header";
import { DailyStats } from "./components/daily-stats";
import { WorkRecordList } from "./components/work-record-list";
import { FabMenu } from "./components/fab-menu";
import {
  WorkRecord,
  DailySummary,
  MOCK_WORK_RECORDS,
  calculateTotalAmount,
} from "./types";

/**
 * 근무 기록 메인 페이지
 *
 * 기능:
 * - 일별 근무 기록 조회
 * - 캘린더로 날짜 선택
 * - 일별 통계 표시
 * - 근무 기록 추가/수정/삭제
 * - 템플릿 적용
 */
export default function WorkRecordsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>(MOCK_WORK_RECORDS);

  // TODO: 모달 상태 관리 (실제 모달 구현 시 활성화)
  // const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  // const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);

  // 선택한 날짜의 근무 기록 필터링
  const selectedDateString = format(selectedDate, "yyyy-MM-dd");
  const filteredRecords = useMemo(() => {
    return workRecords.filter((record) => record.date === selectedDateString);
  }, [workRecords, selectedDateString]);

  // 일별 통계 계산
  const dailySummary = useMemo((): DailySummary => {
    const totalVisits = filteredRecords.length;
    let totalSales = 0;
    let collectedSales = 0;
    let uncollectedSales = 0;

    filteredRecords.forEach((record) => {
      const amount = calculateTotalAmount(record.items);
      totalSales += amount;
      if (record.isCollected) {
        collectedSales += amount;
      } else {
        uncollectedSales += amount;
      }
    });

    return {
      totalVisits,
      totalSales,
      collectedSales,
      uncollectedSales,
    };
  }, [filteredRecords]);

  // 핸들러: 근무 기록 추가
  const handleAddRecord = () => {
    // TODO: 모달 열기
    console.log("근무 기록 추가 모달 열기");
    // setIsAddModalOpen(true);
    alert("근무 기록 추가 모달 (구현 예정)");
  };

  // 핸들러: 템플릿 적용
  const handleApplyTemplate = () => {
    // TODO: 템플릿 선택 모달 열기
    console.log("템플릿 적용 모달 열기");
    // setIsTemplateModalOpen(true);
    alert("템플릿 적용 모달 (구현 예정)");
  };

  // 핸들러: 근무 기록 수정
  const handleEditRecord = (record: WorkRecord) => {
    // TODO: 수정 모달 열기
    console.log("근무 기록 수정:", record);
    // setEditingRecord(record);
    // setIsAddModalOpen(true);
    alert(`근무 기록 수정 모달 (구현 예정)\n매장: ${record.store.name}`);
  };

  // 핸들러: 근무 기록 삭제
  const handleDeleteRecord = (id: string) => {
    setWorkRecords((prev) => prev.filter((record) => record.id !== id));
    console.log("근무 기록 삭제:", id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-8">
        {/* 페이지 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">근무 기록</h1>
          <p className="text-gray-600 text-sm mt-1">
            일별 방문 기록과 거래 내역을 관리합니다
          </p>
        </div>

        {/* 캘린더 헤더 */}
        <CalendarHeader
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />

        {/* 일별 통계 */}
        <DailyStats summary={dailySummary} />

        {/* 근무 기록 리스트 */}
        <WorkRecordList
          records={filteredRecords}
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
        />

        {/* Floating Action Button */}
        <FabMenu
          onAddRecord={handleAddRecord}
          onApplyTemplate={handleApplyTemplate}
        />
      </div>

      {/* TODO: 모달 컴포넌트 추가 */}
      {/* <WorkRecordModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRecord(null);
        }}
        editRecord={editingRecord}
        selectedDate={selectedDate}
      />
      <TemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      /> */}
    </div>
  );
}
