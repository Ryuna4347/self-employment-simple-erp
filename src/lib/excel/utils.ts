import { getDay, getDate } from "date-fns"
import type { WeekGroup, Weekday } from "./types"

/**
 * 특정 날짜가 해당 월에서 해당 요일의 몇 번째 출현인지 계산
 *
 * @example
 * 2026-03-02 (월) → 1번째 월요일 → occurrence = 1
 * 2026-03-09 (월) → 2번째 월요일 → occurrence = 2
 * 2026-03-16 (월) → 3번째 월요일 → occurrence = 3
 */
export function getWeekdayOccurrence(date: Date): number {
  const dayOfMonth = getDate(date) // 1~31
  return Math.ceil(dayOfMonth / 7)
}

/**
 * occurrence를 주차 그룹으로 매핑
 * 홀수 (1, 3, 5) → WeekGroup 1 (1주차)
 * 짝수 (2, 4)    → WeekGroup 2 (2주차)
 */
export function getWeekGroup(occurrence: number): WeekGroup {
  return occurrence % 2 === 1 ? 1 : 2
}

/**
 * 날짜에서 요일 + 주차 그룹을 추출
 * 토/일은 null 반환 (제외 대상)
 */
export function getDateClassification(
  date: Date
): { weekday: Weekday; weekGroup: WeekGroup } | null {
  const dayOfWeek = getDay(date) // 0=Sun, 1=Mon, ..., 6=Sat

  // 토/일 제외
  if (dayOfWeek === 0 || dayOfWeek === 6) return null

  const occurrence = getWeekdayOccurrence(date)
  return {
    weekday: dayOfWeek as Weekday,
    weekGroup: getWeekGroup(occurrence),
  }
}

/**
 * 주소에서 시/구 추출
 *
 * "서울특별시 강남구 역삼로 123" → "서울 강남구"
 * "경기도 성남시 분당구 판교로"  → "성남시 분당구"
 * "부산광역시 해운대구 센텀로"   → "부산 해운대구"
 * "서울 마포구 연남동"           → "서울 마포구"
 */
export function parseShortAddress(fullAddress: string | null): string {
  if (!fullAddress) return "-"

  const parts = fullAddress.trim().split(/\s+/)

  let city = ""
  let district = ""

  for (const part of parts) {
    // 시 찾기: ~특별시, ~광역시, ~특별자치시, ~시
    if (!city) {
      if (
        part.endsWith("특별시") ||
        part.endsWith("광역시") ||
        part.endsWith("특별자치시")
      ) {
        city = part.replace(/(특별시|광역시|특별자치시)$/, "")
      } else if (part.endsWith("시") && !part.endsWith("도시")) {
        city = part
      } else if (
        ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종"].includes(
          part
        )
      ) {
        city = part
      }
    }

    // 구 찾기
    if (!district && part.endsWith("구")) {
      district = part
    }
  }

  if (city && district) return `${city} ${district}`
  if (city) return city
  if (district) return district

  // Fallback: 첫 두 토큰
  return parts.slice(0, 2).join(" ") || "-"
}

/**
 * PaymentType 한국어 라벨
 */
export function getPaymentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    CASH: "현금",
    ACCOUNT: "계좌",
    CARD: "카드",
  }
  return labels[type] ?? type
}
