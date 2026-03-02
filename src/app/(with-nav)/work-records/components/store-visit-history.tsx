"use client"

import { useMemo } from "react"
import { format, parseISO, isSameDay } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar, Loader2 } from "lucide-react"
import { useStoreVisits } from "../hooks/use-store-visits"
import { cn } from "@/lib/utils"

interface StoreVisitHistoryProps {
  storeId: string
  currentDate: string
  isExpanded: boolean
}

/**
 * 매장 방문 이력 (최근 6개월)
 * 카드 확장 시 lazy load, 현재 날짜 제외
 */
export function StoreVisitHistory({
  storeId,
  currentDate,
  isExpanded,
}: StoreVisitHistoryProps) {
  const { data: visits, isLoading } = useStoreVisits(storeId, isExpanded)

  const filteredVisits = useMemo(() => {
    if (!visits) return []
    const currentDateObj = parseISO(currentDate)
    return visits.filter((v) => !isSameDay(parseISO(v.date), currentDateObj))
  }, [visits, currentDate])

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
        <Loader2 className="size-4 animate-spin" />
        <span>방문 이력 조회 중...</span>
      </div>
    )
  }

  if (filteredVisits.length === 0) {
    return null
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
        <Calendar className="size-4" />
        최근 방문 이력
        <span className="text-gray-400 font-normal">
          ({filteredVisits.length}회)
        </span>
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {filteredVisits.map((visit, index) => (
          <span
            key={index}
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-md text-xs border",
              visit.collectionStatus === "UNCOLLECTED"
                ? "bg-red-50 text-red-700 border-red-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            )}
          >
            {format(parseISO(visit.date), "M/d(EEE)", { locale: ko })}
          </span>
        ))}
      </div>
    </div>
  )
}
