"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { toKSTDateString } from "@/lib/date-utils"
import { preloadOnIdle } from "@/lib/preload-on-idle"

// 날짜 선택 달력(react-day-picker)은 헤더를 펼칠 때만 필요하므로 초기 번들에서 분리한다.
// 로딩 중에는 달력 높이만큼 자리를 잡아 펼친 영역이 튀지 않게 한다
// (로더는 next/dynamic과 미리 받기에서 함께 써야 같은 청크를 재사용한다)
const loadCalendar = () => import("@/components/ui/calendar")
const Calendar = dynamic(
  () => loadCalendar().then((m) => m.Calendar),
  { ssr: false, loading: () => <div className="h-[300px]" aria-hidden="true" /> }
)

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function CalendarHeader({ selectedDate, onDateChange }: CalendarHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  // 첫 화면을 그린 뒤 유휴 시간에 달력 청크를 미리 받아, 처음 펼칠 때 지연이 없도록 한다
  useEffect(() => preloadOnIdle([loadCalendar]), [])

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // 미래 날짜 선택 차단 (KST 기준)
      if (toKSTDateString(date) > toKSTDateString(new Date())) {
        return
      }
      onDateChange(date)
      setIsOpen(false)
    }
  }

  const handleToday = () => {
    onDateChange(new Date())
    setIsOpen(false)
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <h2 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, "yyyy년 M월 d일 EEEE", { locale: ko })}
            </h2>
            <ChevronDown className={cn("size-5 text-gray-400 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-gray-200 p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              defaultMonth={selectedDate}
              disabled={{ after: new Date() }}
              locale={ko}
              className="w-full"
            />
            {!isToday && (
              <div className="flex justify-center mt-2">
                <Button variant="link" size="sm" onClick={handleToday} className="text-xs text-primary">
                  오늘로 이동
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
