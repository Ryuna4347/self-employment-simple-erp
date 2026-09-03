"use client";

import { useState } from "react";
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
import {
  DollarSign,
  AlertCircle,
  TrendingUp,
  Users,
  Loader2,
  Download,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshFab } from "@/components/common/refresh-fab";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDashboard,
  type DashboardPeriod,
  type ChartDataPoint,
} from "../hooks/use-dashboard";

// 연도 옵션 생성 (2024 ~ 현재 연도)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
}

// 월 옵션 (1~12)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

// 수금 현황 파이차트 색상
const COLLECTION_COLORS = {
  collected: "#3b82f6",
  uncollected: "#ef4444",
} as const;

// 전월 비교 라인 색상 (결제유형 색상과 구분되는 중립 회색 + 점선)
const COMPARE_LINE_COLOR = "#6b7280";

// 매출 차트 툴팁 정렬: 전월 항목을 맨 위에, 나머지는 기본 정렬(시리즈명순) 그대로
// Recharts 3 Tooltip 기본 itemSorter는 "name"이라 "전월"이 결제유형 사이에 끼어들어 이를 분리한다
const revenueTooltipSorter = (item: { dataKey?: unknown; name?: unknown }) =>
  item.dataKey === "compareRevenue" ? "" : String(item.name ?? "");

/**
 * 관리자 대시보드 메인 컨텐츠
 *
 * 매출 통계, 차트, 상위 매장, 미수금 현황을 표시한다.
 * period(일별/월별), year, month로 조회 기간을 제어한다.
 */
export function DashboardContent() {
  const now = new Date();
  const [period, setPeriod] = useState<DashboardPeriod>("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // 월별 모드에서는 month를 전달하지 않음. 일별 모드면 API가 전월 비교를 항상 함께 반환
  const { data, isLoading, isError, isFetching, refetch } = useDashboard(
    period,
    year,
    period === "daily" ? month : undefined,
  );

  const [isExporting, setIsExporting] = useState(false);
  const [selection, setSelection] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const periodKey = `${period}-${year}-${month}`;
  const selectedBarLabel =
    selection?.key === periodKey ? selection.label : null;
  const [isDeletedStoresModalOpen, setIsDeletedStoresModalOpen] =
    useState(false);
  const [isNewlyAddedStoresModalOpen, setIsNewlyAddedStoresModalOpen] =
    useState(false);

  const yearOptions = getYearOptions();
  const isCurrentPeriod =
    year === now.getFullYear() && month === now.getMonth() + 1;

  // 월간 엑셀 다운로드
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/admin/export/monthly?year=${year}&month=${month}`,
      );
      if (!res.ok) throw new Error("다운로드 실패");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `근무기록_${year}년_${month}월.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("엑셀 다운로드에 실패했습니다.");
    } finally {
      setIsExporting(false);
    }
  };

  // 수금 현황 파이차트 데이터
  const collectionData = data
    ? [
        { name: "수금 완료", value: data.collectionStatus.collected },
        { name: "미수", value: data.collectionStatus.uncollected },
      ]
    : [];

  const collectionColors = [
    COLLECTION_COLORS.collected,
    COLLECTION_COLORS.uncollected,
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 기간 선택 영역 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {/* 연도 선택 */}
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 월 선택 (일별 모드에서만 표시) */}
        {period === "daily" && (
          <Select
            value={String(month)}
            onValueChange={(v) => setMonth(Number(v))}
          >
            <SelectTrigger className="w-[90px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* 이번 달로 돌아오기 */}
        <Button
          variant="outline"
          size="sm"
          disabled={isCurrentPeriod}
          onClick={() => {
            setYear(now.getFullYear());
            setMonth(now.getMonth() + 1);
          }}
        >
          이번 달
        </Button>

        {/* 기간 토글 버튼 */}
        <div className="flex gap-1 ml-auto">
          <Button
            variant={period === "daily" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("daily")}
          >
            일별
          </Button>
          <Button
            variant={period === "monthly" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod("monthly")}
          >
            월별
          </Button>
        </div>

        {/* 엑셀 다운로드 버튼 */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          엑셀
        </Button>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 에러 상태 */}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive text-sm">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        </div>
      )}

      {/* 대시보드 콘텐츠 */}
      {data && (
        <>
          {/* 통계 카드 (2x2 그리드) */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* 총 매출 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">총 매출</p>
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-blue-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-blue-600">
                  {data.summary.totalRevenue.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 총 비용 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">총 비용</p>
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Receipt className="w-4 h-4 text-orange-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-orange-600">
                  {data.summary.totalExpenses.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 미수금 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">미수금</p>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-red-600">
                  {data.summary.outstandingAmount.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 총 방문 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">총 방문</p>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-green-600">
                  {data.summary.totalVisits}건
                </p>
              </div>
            </div>

            {/* 거래 매장 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">거래 매장</p>
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-500" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-purple-600">
                  {data.summary.uniqueStores}곳
                </p>
              </div>
            </div>

            {/* 제거된 매장 / 추가된 매장 (좌우 분할) */}
            <div className="grid grid-cols-2 gap-3">
              {/* 제거된 매장 */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">제거 매장</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-700">
                    {data.summary.deletedStoresCount}곳
                  </p>
                </div>
              </div>

              {/* 추가된 매장 */}
              <div className="bg-white rounded-lg shadow-sm p-3">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">추가 매장</p>
                  </div>
                  <p className="text-lg font-semibold text-emerald-600">
                    {data.summary.newlyAddedStoresCount}곳
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 결제유형별 매출 상세 (차트 클릭 시) */}
          {selectedBarLabel &&
            (() => {
              const point = data.chart.find(
                (d) => d.label === selectedBarLabel,
              );
              if (!point) return null;
              return (
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-900">
                      {selectedBarLabel} 결제유형별 매출
                    </p>
                    <button
                      onClick={() => setSelection(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-orange-50 rounded">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-1"
                        style={{ backgroundColor: "#f97316" }}
                      />
                      <p className="text-xs text-gray-600 mt-1">카드</p>
                      <p className="text-sm font-semibold text-orange-500">
                        {point.card.toLocaleString()}원
                      </p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-1"
                        style={{ backgroundColor: "#16a34a" }}
                      />
                      <p className="text-xs text-gray-600 mt-1">현금</p>
                      <p className="text-sm font-semibold text-green-600">
                        {point.cash.toLocaleString()}원
                      </p>
                    </div>
                    <div className="text-center p-2 bg-violet-50 rounded">
                      <span
                        className="inline-block w-3 h-3 rounded-sm mr-1"
                        style={{ backgroundColor: "#7c3aed" }}
                      />
                      <p className="text-xs text-gray-600 mt-1">계좌이체</p>
                      <p className="text-sm font-semibold text-violet-600">
                        {point.account.toLocaleString()}원
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-2">
                    합계: {point.revenue.toLocaleString()}원
                  </p>
                </div>
              );
            })()}

          {/* 차트 섹션 */}
          <div className="space-y-6 mb-6">
            {/* 매출 추이 차트 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                매출 추이
              </h3>
              {data.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart
                    data={data.chart}
                    onClick={(state) => {
                      if (state?.activeLabel != null) {
                        const label = String(state.activeLabel);
                        setSelection((prev) =>
                          prev?.key === periodKey && prev.label === label
                            ? null
                            : { key: periodKey, label },
                        );
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      itemSorter={revenueTooltipSorter}
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
                    <Bar
                      dataKey="card"
                      stackId="a"
                      fill="#f97316"
                      name="카드"
                    />
                    <Bar
                      dataKey="cash"
                      stackId="a"
                      fill="#16a34a"
                      name="현금"
                    />
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
                <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
                  데이터가 없습니다
                </div>
              )}
            </div>

            {/* 비용 추이 차트 (월별 모드에서만) */}
            {period === "monthly" && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  비용 추이
                </h3>
                {data.expenseChart.some((d) => d.amount > 0) ? (
                  <ResponsiveContainer width="100%" height={250}>
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
                  <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
                    데이터가 없습니다
                  </div>
                )}
              </div>
            )}

            {/* 수금 현황 파이차트 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                수금 현황
              </h3>
              {collectionData.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={250}>
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
                        <Cell
                          key={`cell-${index}`}
                          fill={collectionColors[index]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value}건`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
                  데이터가 없습니다
                </div>
              )}
            </div>
          </div>

          {/* 제거된 매장 + 추가된 매장 */}
          <div className="space-y-6">
            {/* 제거된 매장 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  제거된 매장
                </h3>
                {data.deletedStores.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setIsDeletedStoresModalOpen(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    더보기
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {data.deletedStores.length > 0 ? (
                  data.deletedStores.slice(0, 5).map((store) => (
                    <div
                      key={store.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border-l-4 border-gray-400"
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
                        {store.deletedAt}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400">
                    제거된 매장이 없습니다
                  </div>
                )}
              </div>
            </div>

            {/* 추가된 매장 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  추가된 매장
                </h3>
                {data.newlyAddedStores.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setIsNewlyAddedStoresModalOpen(true)}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    더보기
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {data.newlyAddedStores.length > 0 ? (
                  data.newlyAddedStores.slice(0, 5).map((store) => (
                    <div
                      key={store.id}
                      className="flex items-center justify-between p-3 bg-emerald-50 rounded border-l-4 border-emerald-500"
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
                        {store.createdAt}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400">
                    추가된 매장이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 제거된 매장 전체 목록 모달 */}
          <ResponsiveModal
            open={isDeletedStoresModalOpen}
            onOpenChange={setIsDeletedStoresModalOpen}
          >
            <ResponsiveModalContent className="sm:max-w-md">
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>
                  제거된 매장 ({data.deletedStores.length}곳)
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <div className="px-4 sm:px-6 pb-4 flex-1 min-h-0 overflow-y-auto space-y-2 sm:flex-none sm:max-h-[60vh]">
                {data.deletedStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border-l-4 border-gray-400"
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
                      {store.deletedAt}
                    </span>
                  </div>
                ))}
              </div>
            </ResponsiveModalContent>
          </ResponsiveModal>

          {/* 추가된 매장 전체 목록 모달 */}
          <ResponsiveModal
            open={isNewlyAddedStoresModalOpen}
            onOpenChange={setIsNewlyAddedStoresModalOpen}
          >
            <ResponsiveModalContent className="sm:max-w-md">
              <ResponsiveModalHeader>
                <ResponsiveModalTitle>
                  추가된 매장 ({data.newlyAddedStores.length}곳)
                </ResponsiveModalTitle>
              </ResponsiveModalHeader>
              <div className="px-4 sm:px-6 pb-4 flex-1 min-h-0 overflow-y-auto space-y-2 sm:flex-none sm:max-h-[60vh]">
                {data.newlyAddedStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center justify-between p-3 bg-emerald-50 rounded border-l-4 border-emerald-500"
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
                      {store.createdAt}
                    </span>
                  </div>
                ))}
              </div>
            </ResponsiveModalContent>
          </ResponsiveModal>
        </>
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  );
}
