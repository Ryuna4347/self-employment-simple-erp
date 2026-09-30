"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type {
  DashboardData,
  DashboardPeriod,
  ChartDataPoint,
  CompareTailPoint,
} from "../hooks/use-dashboard";
import { CHART_HEIGHT, REVENUE_CHART_HEIGHT } from "./dashboard-charts-skeleton";

/**
 * 대시보드 차트 섹션 (매출 추이 / 누적 매출 / 비용 추이 / 수금 현황)
 *
 * recharts가 무거워(gzip 약 100KB) dashboard-content에서 next/dynamic으로 지연 로드한다.
 * 요약 카드·필터는 먼저 그리고, 차트 코드는 데이터 조회와 병렬로 내려받는다.
 */

// 수금 현황 파이차트 색상
const COLLECTION_COLORS = {
  collected: "#3b82f6",
  uncollected: "#ef4444",
} as const;

// 전월 비교 라인 색상 (결제유형 색상과 구분되는 중립 회색 + 점선)
const COMPARE_LINE_COLOR = "#6b7280";

// 누적 매출 라인 색상 (결제유형 색상·전월 회색과 구분되는 파랑)
const CUMULATIVE_LINE_COLOR = "#2563eb";

// 매출/누적 차트 툴팁 정렬: 전월 항목을 맨 위에, 나머지는 기본 정렬(시리즈명순) 그대로
// Recharts 3 Tooltip 기본 itemSorter는 "name"이라 "전월"이 결제유형 사이에 끼어들어 이를 분리한다
const compareFirstTooltipSorter = (item: {
  dataKey?: unknown;
  name?: unknown;
}) =>
  item.dataKey === "compareRevenue" || item.dataKey === "compareCumulative"
    ? ""
    : String(item.name ?? "");

/** 누적 매출 차트 데이터 포인트. chart[]·compareTail[]에서 클라이언트 파생 */
interface CumulativeChartPoint {
  label: string;
  compareLabel: string | null;
  // 당월(일별)/당해(월별) 누적 매출. 오늘/이번 달 이후 구간과 당월에 없는 일자는 null → 라인 끊김
  cumulative: number | null;
  // 전월 같은 일자까지의 누적 매출 (일별 모드 전용). 전월에 없는 날짜부터 null
  compareCumulative: number | null;
}

/**
 * chart[]의 revenue / compareRevenue를 누적합으로 변환
 * 서버가 1일~말일(일별) 또는 1~12월(월별) 순서로 빈 구간까지 채워 보내므로 인덱스 = 일/월 - 1
 *
 * 전월이 당월보다 긴 달이면(예: 9월 30일 ↔ 8월 31일) compareTail[]로 가로축을 긴 달에 맞춰
 * 늘리고, 그 구간은 전월 라인만 그린다
 */
function buildCumulativeChart(
  chart: readonly ChartDataPoint[],
  compareTail: readonly CompareTailPoint[],
  visibleCount: number,
  compareVisibleCount: number,
): CumulativeChartPoint[] {
  let running = 0;
  let compareRunning: number | null = 0;
  const points = chart.map((point, index) => {
    running += point.revenue;
    if (compareRunning !== null) {
      compareRunning =
        point.compareRevenue === null
          ? null
          : compareRunning + point.compareRevenue;
    }
    return {
      label: point.label,
      compareLabel: point.compareLabel,
      cumulative: index < visibleCount ? running : null,
      compareCumulative:
        compareRunning !== null && index < compareVisibleCount
          ? compareRunning
          : null,
    };
  });

  // 당월에 없는 일자(예: 9월 조회 시 8월 31일)는 당월 누적을 항상 null로 두고 전월 누적만 잇는다
  compareTail.forEach((point, offset) => {
    const index = chart.length + offset;
    if (compareRunning !== null) {
      compareRunning += point.compareRevenue;
    }
    points.push({
      label: point.label,
      compareLabel: point.compareLabel,
      cumulative: null,
      compareCumulative:
        compareRunning !== null && index < compareVisibleCount
          ? compareRunning
          : null,
    });
  });

  return points;
}

interface DashboardChartsProps {
  data: DashboardData;
  period: DashboardPeriod;
  year: number;
  month: number;
  /** 누적 라인을 그릴 선행 포인트 개수 (현재 기간은 오늘/이번 달까지) */
  visibleCount: number;
  /** 전월 누적 라인을 그릴 선행 포인트 개수 (일별 모드 전용) */
  compareVisibleCount: number;
  /** 매출 추이 막대 클릭 시 해당 라벨 전달 (결제유형별 상세 패널 토글) */
  onBarSelect: (label: string) => void;
}

export function DashboardCharts({
  data,
  period,
  year,
  month,
  visibleCount,
  compareVisibleCount,
  onBarSelect,
}: DashboardChartsProps) {
  // 누적 매출 차트: 가로축은 당월/전월 중 일수가 많은 달 기준 (data.compareTail)
  const cumulativeChart = useMemo(
    () =>
      buildCumulativeChart(
        data.chart,
        data.compareTail,
        visibleCount,
        compareVisibleCount,
      ),
    [data, visibleCount, compareVisibleCount],
  );

  // 수금 현황 파이차트 데이터
  const collectionData = [
    { name: "수금 완료", value: data.collectionStatus.collected },
    { name: "미수", value: data.collectionStatus.uncollected },
  ];

  const collectionColors = [
    COLLECTION_COLORS.collected,
    COLLECTION_COLORS.uncollected,
  ];

  return (
    <div className="space-y-6 mb-6">
      {/* 매출 추이 차트 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">매출 추이</h3>
        {data.chart.length > 0 ? (
          <ResponsiveContainer width="100%" height={REVENUE_CHART_HEIGHT}>
            <ComposedChart
              data={data.chart}
              onClick={(state) => {
                if (state?.activeLabel != null) {
                  onBarSelect(String(state.activeLabel));
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width="auto" />
              <Tooltip
                itemSorter={compareFirstTooltipSorter}
                formatter={(value, name, item) => {
                  // 전월 비교 라인은 시리즈명("2026년 8월") 대신 해당 전월 일자("08/03")로 표기
                  const point = item?.payload as ChartDataPoint | undefined;
                  const displayName =
                    item?.dataKey === "compareRevenue" && point?.compareLabel
                      ? point.compareLabel
                      : name;
                  return [`${Number(value).toLocaleString()}원`, displayName];
                }}
                labelFormatter={(label) => {
                  const point = data.chart.find((d) => d.label === label);
                  return point
                    ? `${label} (합계: ${point.revenue.toLocaleString()}원)`
                    : String(label);
                }}
              />
              <Legend />
              <Bar dataKey="card" stackId="a" fill="#f97316" name="카드" />
              <Bar dataKey="cash" stackId="a" fill="#16a34a" name="현금" />
              <Bar
                dataKey="account"
                stackId="a"
                fill="#7c3aed"
                name="계좌이체"
                radius={[4, 4, 0, 0]}
              />
              {/* 전월 매출 (같은 축, 점선). 일별 모드에서 항상 표시, 전월에 없는 날짜는 끊어서 표시 */}
              {period === "daily" && (
                <Line
                  type="monotone"
                  dataKey="compareRevenue"
                  name="전월"
                  stroke={COMPARE_LINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-sm text-gray-400"
            style={{ height: REVENUE_CHART_HEIGHT }}
          >
            데이터가 없습니다
          </div>
        )}
      </div>

      {/* 누적 매출 차트. 일별: 당월 누적 + 전월 같은 일자까지 누적(점선), 월별: 당해 연 누적 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          {period === "daily" ? "월 누적 매출" : "연 누적 매출"}
        </h3>
        {cumulativeChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={cumulativeChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width="auto" />
              <Tooltip
                itemSorter={compareFirstTooltipSorter}
                // 두 라인 모두 일자로 표기하므로 툴팁 상단 라벨 행(현재 일자)은 숨긴다
                labelStyle={{ display: "none" }}
                formatter={(value, name, item) => {
                  // 시리즈명("9월 누적"/"전월") 대신 해당 일자("09/03"/"08/03")로 표기
                  const point = item?.payload as
                    | CumulativeChartPoint
                    | undefined;
                  const dateLabel =
                    item?.dataKey === "compareCumulative"
                      ? point?.compareLabel
                      : point?.label;
                  return [
                    `${Number(value).toLocaleString()}원`,
                    dateLabel ?? name,
                  ];
                }}
              />
              <Legend />
              {/* 보이는 포인트가 1개뿐이면(매월 1일, 1월) 선이 그려지지 않으므로 점으로 표시 */}
              <Line
                type="monotone"
                dataKey="cumulative"
                name={period === "daily" ? `${month}월 누적` : `${year}년 누적`}
                stroke={CUMULATIVE_LINE_COLOR}
                strokeWidth={2}
                dot={visibleCount <= 1}
                activeDot={{ r: 4 }}
                connectNulls={false}
                isAnimationActive={false}
              />
              {/* 전월 누적 (점선). 일별 모드에서만, 전월에 없는 날짜부터 끊어서 표시 */}
              {period === "daily" && (
                <Line
                  type="monotone"
                  dataKey="compareCumulative"
                  name="전월"
                  stroke={COMPARE_LINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-sm text-gray-400"
            style={{ height: CHART_HEIGHT }}
          >
            데이터가 없습니다
          </div>
        )}
      </div>

      {/* 비용 추이 차트 (월별 모드에서만) */}
      {period === "monthly" && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-4">비용 추이</h3>
          {data.expenseChart.some((d) => d.amount > 0) ? (
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              <LineChart data={data.expenseChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toLocaleString()}원`,
                    "비용",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316", r: 4 }}
                  name="비용"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex items-center justify-center text-sm text-gray-400"
              style={{ height: CHART_HEIGHT }}
            >
              데이터가 없습니다
            </div>
          )}
        </div>
      )}

      {/* 수금 현황 파이차트 */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-4">수금 현황</h3>
        {collectionData.some((d) => d.value > 0) ? (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
              <Pie
                data={collectionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}건`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {collectionData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={collectionColors[index]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [`${value}건`, name]} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center text-sm text-gray-400"
            style={{ height: CHART_HEIGHT }}
          >
            데이터가 없습니다
          </div>
        )}
      </div>
    </div>
  );
}
