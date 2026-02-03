import { cookies } from "next/headers"
import { decode } from "next-auth/jwt"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { createSessionCookie } from "@/lib/session-cookie"

// Auth.js 쿠키 이름
const AUTH_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Secure-authjs.session-token"
  : "authjs.session-token"

// JWT 페이로드 타입
interface JWTPayload {
  id?: string
  rememberMe?: boolean
}

/**
 * POST /api/auth/init-session
 *
 * 세션 쿠키 초기화 API
 * - 로그인 성공 직후 호출
 * - JWT 쿠키가 유효하면 session-check 쿠키 생성
 *
 * 배경:
 * Auth.js signIn() 과정에서 JWT 콜백 내의 createSessionCookie()가 호출되지만,
 * iron-session이 설정하는 쿠키가 Auth.js 응답에 포함되지 않음.
 * 따라서 로그인 성공 후 별도로 이 API를 호출하여 세션 쿠키를 설정해야 함.
 */
export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(AUTH_COOKIE_NAME)

    if (!token?.value) {
      return ApiErrors.unauthorized("JWT 쿠키가 없습니다")
    }

    const secret = process.env.AUTH_SECRET
    if (!secret) {
      throw new Error("AUTH_SECRET not set")
    }

    const decoded = await decode({
      token: token.value,
      secret,
      salt: AUTH_COOKIE_NAME,
    })

    if (!decoded) {
      return ApiErrors.unauthorized("JWT 디코딩 실패")
    }

    const data = decoded as JWTPayload

    if (!data.id) {
      return ApiErrors.unauthorized("유효하지 않은 세션")
    }

    // rememberMe 값에 따라 세션 쿠키 생성
    // rememberMe=true: maxAge 7일 (persistent cookie)
    // rememberMe=false: maxAge 없음 (session cookie, 브라우저 종료 시 삭제)
    await createSessionCookie(data.rememberMe ?? false)

    return apiSuccess({ ok: true })
  } catch {
    return ApiErrors.internalError("세션 초기화 실패")
  }
}
