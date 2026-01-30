"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface CalendarHeaderProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
}

export function CalendarHeader({ selectedDate, onDateChange }: CalendarHeaderProps) {
  const [isOpen, setIsOpen] = useState(false)

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
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
