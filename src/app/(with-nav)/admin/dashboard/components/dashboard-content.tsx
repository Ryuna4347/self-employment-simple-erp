"use client";

import { createContext, useContext, useEffect, useState } from "react";
import dynamic from "next/dynamic";
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
import { MountOnFirstOpen } from "@/components/common/mount-on-first-open";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toKSTDateString } from "@/lib/date-utils";
import { preloadOnIdle } from "@/lib/preload-on-idle";
import { useDashboard, type DashboardPeriod } from "../hooks/use-dashboard";
import { DashboardChartsSkeleton } from "./dashboard-charts-skeleton";

// 차트 로딩 중 자리 표시가 현재 조회 모드(월별 4개 / 일별 3개 차트)와 같은 높이가 되도록 모드를 넘긴다.
// next/dynamic의 loading에는 컴포넌트 props가 전달되지 않아 context로 전달한다
const ChartsPeriodContext = createContext<DashboardPeriod>("monthly");

function DashboardChartsLoading() {
  return <DashboardChartsSkeleton period={useContext(ChartsPeriodContext)} />;
}

// 차트(recharts)는 무거우므로 초기 번들에서 분리한다.
// 마운트 직후 청크를 미리 받기 시작해 대시보드 데이터 조회와 병렬로 내려받는다 (아래 useEffect)
// 로더는 next/dynamic과 미리 받기에서 함께 써야 같은 청크를 재사용한다
const loadDashboardCharts = () => import("./dashboard-charts");
const DashboardCharts = dynamic(
  () => loadDashboardCharts().then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => <DashboardChartsLoading />,
  },
);

// 제거/추가 매장 "더보기" 모달은 열 때만 필요하므로 분리한다 (데이터를 그린 뒤 유휴 시간에 미리 받음)
const loadStoreListModal = () => import("./store-list-modal");
const StoreListModal = dynamic(
  () => loadStoreListModal().then((m) => m.StoreListModal),
  { ssr: false },
);

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

/** KST 기준 오늘 (연/월/일) */
interface TodayParts {
  year: number;
  month: number;
  day: number;
}

function getTodayKST(now: Date): TodayParts {
  const [year, month, day] = toKSTDateString(now).split("-").map(Number);
  return { year, month, day };
}

/**
 * 누적 라인을 그릴 선행 포인트 개수 (chart[] 인덱스 기준)
 * - 과거 기간: Infinity (전체)
 * - 현재 기간: 오늘 일자(일별) / 이번 달(월별)까지
 * - 미래 기간: 0 (그리지 않음)
 */
function resolveVisibleCount(
  period: DashboardPeriod,
  year: number,
  month: number,
  today: TodayParts,
): number {
  if (year < today.year) return Infinity;
  if (year > today.year) return 0;
  if (period === "monthly") return today.month;
  if (month < today.month) return Infinity;
  if (month > today.month) return 0;
  return today.day;
}

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

  // 차트 청크를 마운트 직후부터 받아 두어, 데이터가 도착하면 바로 그릴 수 있게 한다
  // (next/dynamic은 컴포넌트가 처음 렌더링될 때 불러오므로, 데이터 도착 후 청크를 받는 순차 대기를 피함)
  useEffect(() => {
    loadDashboardCharts().catch(() => {});
  }, []);

  // "더보기" 모달 청크는 데이터를 그린 뒤 유휴 시간에 미리 받아 둔다.
  // 처음 열 때 받으면, 열어 둔 화면에서 새 배포 이후 처음 누를 때 이전 배포의 청크를 찾지 못해 오류가 날 수 있다
  const hasData = !!data;
  useEffect(() => {
    if (!hasData) return;
    return preloadOnIdle([loadStoreListModal]);
  }, [hasData]);

  // 매출 추이 막대 클릭: 같은 막대를 다시 누르면 상세 패널을 닫는다
  const handleBarSelect = (label: string) => {
    setSelection((prev) =>
      prev?.key === periodKey && prev.label === label
        ? null
        : { key: periodKey, label },
    );
  };

  // 누적 매출 차트: 현재 기간은 오늘(KST)/이번 달까지만 그리고,
  // 전월 라인은 전월이 이번 달인 경우(미래 월 조회)에만 오늘까지 자른다.
  // 가로축은 당월/전월 중 일수가 많은 달 기준 (data.compareTail, 차트 컴포넌트에서 파생)
  const today = getTodayKST(now);
  const visibleCount = resolveVisibleCount(period, year, month, today);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const compareVisibleCount =
    period === "daily"
      ? resolveVisibleCount("daily", prevYear, prevMonth, today)
      : 0;

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

          {/* 차트 섹션 (지연 로드. 로딩 중에는 같은 높이의 자리 표시) */}
          <ChartsPeriodContext.Provider value={period}>
            <DashboardCharts
              data={data}
              period={period}
              year={year}
              month={month}
              visibleCount={visibleCount}
              compareVisibleCount={compareVisibleCount}
              onBarSelect={handleBarSelect}
            />
          </ChartsPeriodContext.Provider>

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

          {/* 제거된 매장 전체 목록 모달 (처음 열 때 마운트) */}
          <MountOnFirstOpen open={isDeletedStoresModalOpen}>
            <StoreListModal
              open={isDeletedStoresModalOpen}
              onOpenChange={setIsDeletedStoresModalOpen}
              title={`제거된 매장 (${data.deletedStores.length}곳)`}
              stores={data.deletedStores.map((store) => ({
                id: store.id,
                name: store.name,
                address: store.address,
                date: store.deletedAt,
              }))}
              variant="deleted"
            />
          </MountOnFirstOpen>

          {/* 추가된 매장 전체 목록 모달 (처음 열 때 마운트) */}
          <MountOnFirstOpen open={isNewlyAddedStoresModalOpen}>
            <StoreListModal
              open={isNewlyAddedStoresModalOpen}
              onOpenChange={setIsNewlyAddedStoresModalOpen}
              title={`추가된 매장 (${data.newlyAddedStores.length}곳)`}
              stores={data.newlyAddedStores.map((store) => ({
                id: store.id,
                name: store.name,
                address: store.address,
                date: store.createdAt,
              }))}
              variant="added"
            />
          </MountOnFirstOpen>
        </>
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  );
}
