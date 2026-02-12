"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOutstanding, useToggleCollection } from "../hooks/use-outstanding"
import { OutstandingCard } from "./outstanding-card"

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

/**
 * 미수금 관리 메인 컨텐츠
 *
 * 월별 미수금 목록을 표시하고 수금 상태 토글을 지원한다.
 * URL 쿼리 파라미터(year, month)로 조회 기간을 관리한다.
 * 낙관적 업데이트(optimistic update)로 토글 시 즉각 반영한다.
 */
export function OutstandingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const now = new Date()

  // URL에서 초기값 읽기 (없으면 현재 연/월)
  const initialYear = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : now.getFullYear()
  const initialMonth = searchParams.get("month")
    ? Number(searchParams.get("month"))
    : now.getMonth() + 1

  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("year", String(year))
    params.set("month", String(month))
    router.replace(`/admin/outstanding?${params.toString()}`)
  }, [year, month, router])

  // 낙관적 업데이트용 토글 상태 맵
  const [toggledItems, setToggledItems] = useState<Map<string, boolean>>(new Map())

  // 기간 변경 시 토글 상태 초기화
  useEffect(() => {
    setToggledItems(new Map())
  }, [year, month])

  // 데이터 조회
  const { data, isLoading, isError } = useOutstanding(year, month)
  const toggleMutation = useToggleCollection()

  // 토글 상태가 반영된 레코드 목록
  const displayRecords = useMemo(() => {
    if (!data?.records) return []
    return data.records.map((record) => ({
      ...record,
      isCollected: toggledItems.has(record.id)
        ? toggledItems.get(record.id)!
        : record.isCollected,
    }))
  }, [data, toggledItems])

  // 동적 요약 (토글 반영)
  const dynamicSummary = useMemo(() => {
    const uncollected = displayRecords.filter((r) => !r.isCollected)
    return {
      totalOutstanding: uncollected.reduce((sum, r) => sum + r.totalAmount, 0),
      count: uncollected.length,
    }
  }, [displayRecords])

  // 토글 중인 레코드 ID
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 수금 상태 토글 핸들러 (낙관적 업데이트)
  const handleToggle = useCallback(
    (id: string, newIsCollected: boolean) => {
      setTogglingId(id)

      // 낙관적 업데이트
      setToggledItems((prev) => new Map(prev).set(id, newIsCollected))

      toggleMutation.mutate(
        { id, isCollected: newIsCollected },
        {
          onError: () => {
            // 실패 시 롤백
            setToggledItems((prev) => {
              const next = new Map(prev)
              next.delete(id)
              return next
            })
          },
          onSettled: () => {
            setTogglingId(null)
          },
        }
      )
    },
    [toggleMutation]
  )

  const yearOptions = getYearOptions()

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 기간 선택 */}
      <div className="flex items-center gap-2 mb-6">
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

        {/* 월 선택 */}
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
      </div>

      {/* 요약 카드 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">미수금 합계</span>
          <span className="text-lg font-bold text-red-600">
            {dynamicSummary.totalOutstanding.toLocaleString()}원
          </span>
        </div>
        <div className="text-xs text-gray-500 text-right mt-1">
          {dynamicSummary.count}건
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

      {/* 미수금 목록 */}
      {data && (
        <div className="space-y-3">
          {displayRecords.length > 0 ? (
            displayRecords.map((record) => (
              <OutstandingCard
                key={record.id}
                record={record}
                onToggle={handleToggle}
                isToggling={togglingId === record.id}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              미수금이 없습니다
            </div>
          )}
        </div>
      )}
    </div>
  )
}
