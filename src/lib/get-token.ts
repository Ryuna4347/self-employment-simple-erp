import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, verifyAccessToken, verifyAccessTokenIgnoreExpiration } from "@/lib/jwt"
import type { NextRequest } from "next/server"
import type { AuthUser } from "@/types/auth"

/**
 * JWT 직접 검증 (서버 컴포넌트에서 사용)
 * - 만료된 토큰은 null 반환
 */
export async function getTokenDirect(): Promise<AuthUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!token) return null

  return verifyAccessToken(token)
}

/**
 * Edge Runtime에서 JWT 토큰 검증
 * - 미들웨어에서 사용 (NextRequest에서 직접 쿠키 읽기)
 * - 만료 무시하고 서명만 검증
 */
export async function getTokenFromRequest(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  if (!token) return null

  return verifyAccessTokenIgnoreExpiration(token)
}
