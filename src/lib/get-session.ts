import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, verifyAccessToken } from "@/lib/jwt"
import { validateRefreshToken } from "@/lib/token-service"
import type { AuthSession } from "@/types/auth"

/**
 * 서버 컴포넌트에서 세션 정보 조회
 *
 * 1. accessToken 유효 → 세션 반환
 * 2. accessToken 만료/없음 → refreshToken으로 DB 조회하여 세션 복구
 *    (서버 컴포넌트에서는 쿠키 설정 불가 → 실제 accessToken 갱신은 클라이언트 첫 API 호출 시 403 폴백으로 처리)
 * 3. 둘 다 없거나 무효 → null (로그인 페이지 리다이렉트)
 */
export async function getSessionFromJWT(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

    // 1. accessToken 유효하면 바로 반환
    if (accessToken) {
      const user = await verifyAccessToken(accessToken)
      if (user) return { user }
    }

    // 2. accessToken 만료/없음 → refreshToken으로 세션 복구 시도
    const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value
    if (!refreshToken) return null

    const record = await validateRefreshToken(refreshToken)
    if (!record) return null

    // DB에서 가져온 최신 유저 정보로 세션 구성
    return {
      user: {
        id: record.User.id,
        name: record.User.name,
        loginId: record.User.loginId,
        role: record.User.role,
      },
    }
  } catch {
    return null
  }
}
