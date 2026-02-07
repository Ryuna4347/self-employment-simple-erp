"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { DollarSign, AlertCircle, TrendingUp, Users, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDashboard, type DashboardPeriod } from "../hooks/use-dashboard"

// 연도 옵션 생성 (2024 ~ 현재 연도)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}

// 월 옵션 (1~12)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

// 수금 현황 파이차트 색상
const COLLECTION_COLORS = {
  collected: "#3b82f6",
  uncollected: "#ef4444",
} as const

/**
 * 관리자 대시보드 메인 컨텐츠
 *
 * 매출 통계, 차트, 상위 매장, 미수금 현황을 표시한다.
 * period(일별/월별), year, month로 조회 기간을 제어한다.
 */
export function DashboardContent() {
  const now = new Date()
  const [period, setPeriod] = useState<DashboardPeriod>("monthly")
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 월별 모드에서는 month를 전달하지 않음
  const { data, isLoading, isError } = useDashboard(
    period,
    year,
    period === "daily" ? month : undefined
  )

  const yearOptions = getYearOptions()

  // 수금 현황 파이차트 데이터
  const collectionData = data
    ? [
        { name: "수금 완료", value: data.collectionStatus.collected },
        { name: "미수", value: data.collectionStatus.uncollected },
      ]
    : []

  const collectionColors = [COLLECTION_COLORS.collected, COLLECTION_COLORS.uncollected]

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
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
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
          </div>

          {/* 차트 섹션 */}
          <div className="space-y-6 mb-6">
            {/* 매출 추이 차트 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">매출 추이</h3>
              {data.chart.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.chart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [
                        `${Number(value).toLocaleString()}원`,
                        "매출",
                      ]}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[250px] text-sm text-gray-400">
                  데이터가 없습니다
                </div>
              )}
            </div>

            {/* 수금 현황 파이차트 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">수금 현황</h3>
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
                      formatter={(value, name) => [
                        `${value}건`,
                        name,
                      ]}
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

          {/* 매출 상위 매장 + 최근 미수금 */}
          <div className="space-y-6">
            {/* 매출 상위 매장 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">
                매출 상위 매장
              </h3>
              {data.topStores.length > 0 ? (
                <div className="space-y-3">
                  {data.topStores.map((store, index) => (
                    <div
                      key={store.name}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                          {index + 1}
                        </div>
                        <span className="text-sm text-gray-900">{store.name}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {store.amount.toLocaleString()}원
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-gray-400">
                  데이터가 없습니다
                </div>
              )}
            </div>

            {/* 최근 미수금 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">최근 미수금</h3>
              <div className="space-y-3">
                {data.recentOutstanding.length > 0 ? (
                  data.recentOutstanding.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded border-l-4 border-red-500"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.storeName}
                        </p>
                        <p className="text-xs text-gray-500">{record.date}</p>
                      </div>
                      <span className="text-sm font-medium text-red-600">
                        {record.totalAmount.toLocaleString()}원
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-400">
                    미수금이 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
