import { cookies } from "next/headers"
import { decode } from "next-auth/jwt"

// Auth.js 쿠키 이름
const AUTH_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token"

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
 * JWT 쿠키를 직접 디코딩하여 세션 정보 반환
 * - auth() 호출 없이 JWT 읽기만 수행
 * - JWT 콜백 실행 안 됨 → race condition 없음
 * - 토큰 갱신은 Route Handler에서만 발생
 */
export async function getSessionFromJWT(): Promise<{
  user: { id: string; name: string; loginId: string; role: "ADMIN" | "USER" }
  error?: string
} | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)

    if (!token?.value) return null

    const secret = process.env.AUTH_SECRET
    if (!secret) throw new Error("AUTH_SECRET not set")

    const decoded = await decode({
      token: token.value,
      secret,
      salt: AUTH_COOKIE_NAME,
    })

    if (!decoded) return null

    const data = decoded as JWTPayload

    // 에러 또는 user.id 없음
    if (data.error || !data.id) {
      return { user: null as any, error: data.error || "InvalidSession" }
    }

    return {
      user: {
        id: data.id,
        name: data.name || "",
        loginId: data.loginId || "",
        role: data.role || "USER",
      }
    }
  } catch {
    // JWT 디코딩 실패 (만료, 변조 등)
    return null
  }
}
