"use client"

import { useMemo } from "react"
import { differenceInCalendarDays, format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { toKSTDateString } from "@/lib/date-utils"
import { useStoreVisits } from "@/app/(with-nav)/work-records/hooks/use-store-visits"
import type { Store } from "../hooks/use-stores"

/** 방문일 조회 기간 (개월) */
const VISIT_DATES_MONTHS = 3

interface StoreVisitDatesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 조회 대상 매장 (닫히는 동안 내용이 사라지지 않도록 닫힌 뒤에도 유지) */
  store: Pick<Store, "id" | "name"> | null
}

interface VisitMonthGroup {
  /** "YYYY-MM" */
  month: string
  /** "YYYY-MM-DD" (최신순) */
  dates: string[]
}

/** 오늘(KST) 기준 경과 일수 라벨 */
function formatDaysAgo(days: number): string {
  if (days < 0) return `${-days}일 후`
  if (days === 0) return "오늘"
  if (days === 1) return "어제"
  return `${days}일 전`
}

/**
 * 매장 방문일 모달
 * - 최근 3개월 수금완료(COLLECTED) 근무기록의 방문일을 월별로 최신순 표시
 * - 같은 날 기록이 여러 건이어도 방문일은 하나로 표시
 */
export function StoreVisitDatesModal({
  open,
  onOpenChange,
  store,
}: StoreVisitDatesModalProps) {
  const { data, error } = useStoreVisits(store?.id ?? null, open, {
    months: VISIT_DATES_MONTHS,
    status: "COLLECTED",
  })

  // KST 날짜 문자열로 변환 → 중복 제거 → 최신순 → 월별 묶음
  // (브라우저 시간대와 무관하게 KST 날짜로 표시)
  const groups = useMemo<VisitMonthGroup[]>(() => {
    if (!data) return []
    const dates = Array.from(
      new Set(data.map((visit) => toKSTDateString(new Date(visit.date))))
    )
      .sort()
      .reverse()

    const byMonth = new Map<string, string[]>()
    for (const date of dates) {
      const month = date.slice(0, 7)
      const list = byMonth.get(month)
      if (list) list.push(date)
      else byMonth.set(month, [date])
    }
    return Array.from(byMonth, ([month, monthDates]) => ({
      month,
      dates: monthDates,
    }))
  }, [data])

  const totalCount = groups.reduce((acc, group) => acc + group.dates.length, 0)
  const today = parseISO(toKSTDateString())

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="break-all">
            {store?.name ?? "매장"} 방문일
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            최근 {VISIT_DATES_MONTHS}개월 · 수금완료 기준
            {data && totalCount > 0 && ` · 총 ${totalCount}회`}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-1 py-2">
          {error ? (
            <div className="py-10 text-center text-sm text-red-500">
              방문일을 불러오지 못했습니다
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : groups.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">
              최근 {VISIT_DATES_MONTHS}개월간 수금완료된 방문 기록이 없습니다
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.month}>
                  <h3 className="mb-1.5 flex items-center justify-between px-1 text-xs font-medium text-gray-500">
                    <span>
                      {format(parseISO(`${group.month}-01`), "yyyy년 M월", {
                        locale: ko,
                      })}
                    </span>
                    <span>{group.dates.length}회</span>
                  </h3>
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-200">
                    {group.dates.map((date) => {
                      const day = parseISO(date)
                      return (
                        <li
                          key={date}
                          className="flex items-center justify-between px-3 py-2.5 text-sm"
                        >
                          <span className="font-medium text-gray-900">
                            {format(day, "M월 d일 (EEE)", { locale: ko })}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDaysAgo(differenceInCalendarDays(today, day))}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <ResponsiveModalFooter className="pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
