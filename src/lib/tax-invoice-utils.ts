/**
 * 세금계산서 외부 API 공통 유틸리티.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000

/**
 * 부가세 포함 금액을 공급가와 세액으로 분리한다.
 */
export function splitVat(amount: number): { supply: number; tax: number } {
  const supply = Math.floor(amount * 10 / 11)
  return { supply, tax: amount - supply }
}

/**
 * 외부 API 호환을 위해 정수 금액을 문자열로 변환한다.
 */
export function formatDecimalString(n: number): string {
  return String(Math.floor(n))
}

/**
 * Date를 KST 오프셋이 포함된 ISO 8601 문자열로 변환한다.
 */
export function formatKSTIso(date: Date): string {
  return new Date(date.getTime() + KST_OFFSET_MS).toISOString().replace("Z", "+09:00")
}
