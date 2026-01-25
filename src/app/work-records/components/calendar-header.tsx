"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";

interface CalendarHeaderProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

/**
 * 캘린더 헤더 컴포넌트
 * - 현재 선택된 날짜 표시
 * - 이전/다음 날짜 네비게이션
 * - 오늘로 이동 버튼
 */
export function CalendarHeader({
  selectedDate,
  onDateChange,
}: CalendarHeaderProps) {
  const handlePrevDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 shadow-sm">
      {/* 날짜 표시 및 네비게이션 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrevDay}
          aria-label="이전 날짜"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div className="flex flex-col items-center gap-1">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, "yyyy년 M월 d일 EEEE", { locale: ko })}
          </h2>
          {!isToday && (
            <Button
              variant="link"
              size="sm"
              onClick={handleToday}
              className="text-xs h-auto p-0 text-primary"
            >
              오늘로 이동
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNextDay}
          aria-label="다음 날짜"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>
    </div>
  );
}
