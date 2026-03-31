"use client"

/**
 * accessToken 만료 시간을 메모리에서 관리
 *
 * httpOnly 쿠키라 JS에서 직접 읽을 수 없으므로,
 * 로그인/갱신 API 응답에서 받은 expiresAt을 전역 변수에 저장한다.
 *
 * 페이지 새로고침 시 초기화되지만, 403 폴백이 있어 문제 없음.
 */

const REFRESH_THRESHOLD = 10 * 60 // 갱신 임계값 10분 (초)

let tokenExpiresAt: number | null = null

/**
 * accessToken 만료 시간 저장 (epoch seconds)
 */
export function setTokenExpiry(expiresAt: number) {
  tokenExpiresAt = expiresAt
}

/**
 * accessToken 만료 시간 조회
 */
export function getTokenExpiry(): number | null {
  return tokenExpiresAt
}

/**
 * accessToken이 곧 만료되는지 확인 (10분 이내)
 * - 만료 시간이 없으면 false (새로고침 등으로 초기화된 경우, 403 폴백에 의존)
 */
export function isTokenExpiringSoon(): boolean {
  if (tokenExpiresAt === null) return false
  const now = Math.floor(Date.now() / 1000)
  return now + REFRESH_THRESHOLD >= tokenExpiresAt
}

/**
 * 만료 시간 초기화 (로그아웃 시)
 */
export function clearTokenExpiry() {
  tokenExpiresAt = null
}
