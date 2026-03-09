import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { toKSTLocal } from "@/lib/date-utils"

// 방문 주기 라벨 (store-card.tsx와 동일 패턴)
export const visitCycleLabels: Record<number, string> = {
  1: "매주",
  2: "격주",
  4: "월 1회",
}

/**
 * 방문 요일 + 주기 라벨 반환
 * @example "격주 화요일", "매주 월요일", "월 1회 수요일"
 */
export function getVisitDayAndCycle(
  firstVisitDate: string,
  visitCycleWeeks: number
): string {
  const dayOfWeek = format(toKSTLocal(new Date(firstVisitDate)), "EEEE", { locale: ko })
  const cycleLabel = visitCycleLabels[visitCycleWeeks] ?? `${visitCycleWeeks}주`
  return `${cycleLabel} ${dayOfWeek}`
}
