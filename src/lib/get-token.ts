import { cookies } from 'next/headers'
import { decode } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const COOKIE_NAME = IS_PRODUCTION
  ? '__Secure-authjs.session-token'
  : 'authjs.session-token'

// JWT 페이로드 타입
interface JWTPayload {
  id?: string
  name?: string
  loginId?: string
  role?: "ADMIN" | "USER"
  accessTokenExpires?: number
  error?: string
}

/**
 * JWT 직접 디코딩 (jwt 콜백 실행 없이)
 * - 서버 컴포넌트에서 사용
 * - 토큰 갱신은 수행하지 않음 (API 호출 시 갱신됨)
 */
export async function getTokenDirect(): Promise<JWTPayload | null> {
  const secret = process.env.AUTH_SECRET
  if (!secret) return null

  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value

  if (!token) return null

  try {
    return await decode({
      token,
      secret,
      salt: COOKIE_NAME,
    }) as JWTPayload | null
  } catch {
    return null
  }
}

/**
 * Edge Runtime에서 JWT 토큰 디코딩
 * - 미들웨어에서 사용 (NextRequest에서 직접 쿠키 읽기)
 * - next-auth/jwt decode 사용 (Edge 호환)
 * - 토큰 갱신 없이 읽기만 수행
 */
export async function getTokenFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value
    if (!token) return null

    const secret = process.env.AUTH_SECRET
    if (!secret) return null

    const decoded = await decode({
      token,
      secret,
      salt: COOKIE_NAME,
    })

    return decoded as JWTPayload | null
  } catch {
    return null
  }
}
