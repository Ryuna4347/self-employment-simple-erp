import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "@/lib/jwt"
import type { AuthSession } from "@/types/auth"

/**
 * 서버 컴포넌트에서 세션 정보 조회
 * - accessToken 쿠키를 읽고 JWT 검증
 * - 유효하면 세션 반환, 아니면 null
 */
export async function getSessionFromJWT(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

    if (!token) return null

    const user = await verifyAccessToken(token)
    if (!user) return null

    return { user }
  } catch {
    return null
  }
}
