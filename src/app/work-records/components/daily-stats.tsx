"use client";

import { DailySummary } from "../types";

interface DailyStatsProps {
  summary: DailySummary;
}

/**
 * 일별 통계 카드 컴포넌트
 * - 총 방문 수
 * - 총 매출 금액
 * - 수금 완료/미수 금액
 */
export function DailyStats({ summary }: DailyStatsProps) {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-5 text-white shadow-md mb-4">
      <div className="grid grid-cols-2 gap-4">
        {/* 총 방문 */}
        <div>
          <p className="text-blue-100 text-sm mb-1">총 방문</p>
          <p className="text-2xl font-bold">{summary.totalVisits}건</p>
        </div>

        {/* 총 매출 */}
        <div className="text-right">
          <p className="text-blue-100 text-sm mb-1">총 매출</p>
          <p className="text-2xl font-bold">
            {summary.totalSales.toLocaleString()}원
          </p>
        </div>
      </div>

      {/* 수금 상태 상세 (있을 경우만 표시) */}
      {summary.totalSales > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-400/30 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-100 mb-0.5">수금 완료</p>
            <p className="font-semibold">
              {summary.collectedSales.toLocaleString()}원
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 mb-0.5">미수금</p>
            <p className="font-semibold">
              {summary.uncollectedSales.toLocaleString()}원
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
