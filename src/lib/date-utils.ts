/**
 * 날짜 유틸리티 - KST(Asia/Seoul) 기준 정규화
 *
 * 모든 date-only 필드(firstVisitDate, WorkRecord.date 등)를
 * KST 자정 기준으로 저장/비교하기 위한 헬퍼.
 * 한국은 DST가 없으므로 +9시간 고정 오프셋 사용.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * "YYYY-MM-DD" → KST 자정 Date (DB 저장용)
 * @example dateToKSTMidnight("2026-03-09") → 2026-03-08T15:00:00.000Z (= KST 03/09 00:00)
 */
export function dateToKSTMidnight(dateStr: string): Date {
  return new Date(new Date(dateStr + "T00:00:00.000Z").getTime() - KST_OFFSET_MS)
}

/**
 * "YYYY-MM-DD" → KST 하루 끝 Date (DB 범위 쿼리용)
 * @example dateToKSTEndOfDay("2026-03-09") → 2026-03-09T14:59:59.999Z (= KST 03/09 23:59:59.999)
 */
export function dateToKSTEndOfDay(dateStr: string): Date {
  return new Date(new Date(dateStr + "T23:59:59.999Z").getTime() - KST_OFFSET_MS)
}

/**
 * 주어진 시각의 KST 날짜 자정 (기본값: 현재 시각)
 * @example startOfDayKST() → 오늘 한국 시간 자정의 UTC 표현
 */
export function startOfDayKST(date: Date = new Date()): Date {
  const kst = new Date(date.getTime() + KST_OFFSET_MS)
  return dateToKSTMidnight(kst.toISOString().slice(0, 10))
}

/**
 * 주어진 시각의 KST 날짜 문자열 "YYYY-MM-DD"
 */
export function toKSTDateString(date: Date = new Date()): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10)
}

/**
 * DB Date → KST 로컬 Date
 * format(), getDay(), getDate() 등 로컬 타임존 기반 함수에서
 * 올바른 KST 값을 반환하도록 오프셋 보정
 */
export function toKSTLocal(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS)
}

/** KST 기준 월 시작 */
export function startOfMonthKST(year: number, month: number): Date {
  return dateToKSTMidnight(`${year}-${String(month).padStart(2, "0")}-01`)
}

/** KST 기준 월 끝 */
export function endOfMonthKST(year: number, month: number): Date {
  const lastDay = new Date(year, month, 0).getDate()
  return dateToKSTEndOfDay(
    `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
  )
}
