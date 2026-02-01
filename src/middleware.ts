import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie"
import { getTokenFromRequest } from "@/lib/get-token"

// Auth.js 세션 쿠키 이름 (개발/프로덕션)
const AUTH_COOKIE_NAME = "authjs.session-token"
const AUTH_COOKIE_NAME_SECURE = "__Secure-authjs.session-token"

/**
 * 인증 미들웨어
 * - auth() 호출 없이 JWT 직접 디코딩 (race condition 방지)
 * - 세션 체크 쿠키 + JWT 에러 검증
 * - 관리자 권한 체크
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 로그인/회원가입 페이지는 세션 체크 안함
  if (pathname === "/" || pathname.startsWith("/register")) {
    // 이미 로그인된 사용자 리다이렉트 처리
    const token = await getTokenFromRequest(request)
    const isSessionExpired = request.nextUrl.searchParams.get("sessionExpired") === "true"

    if (token?.id && !token.error && !isSessionExpired) {
      return NextResponse.redirect(new URL("/work-records", request.url))
    }
    return NextResponse.next()
  }

  // 2. 세션 체크 쿠키 확인 (브라우저 종료 감지)
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  if (!sessionCookie) {
    const url = new URL("/", request.url)
    url.searchParams.set("sessionExpired", "true")
    const response = NextResponse.redirect(url)
    response.cookies.delete(AUTH_COOKIE_NAME)
    response.cookies.delete(AUTH_COOKIE_NAME_SECURE)
    return response
  }

  // 3. JWT 토큰 디코딩 및 검증
  const token = await getTokenFromRequest(request)

  // 토큰 없음 또는 에러 → 로그인 페이지로
  if (!token || token.error || !token.id) {
    const url = new URL("/", request.url)
    url.searchParams.set("sessionExpired", "true")
    const response = NextResponse.redirect(url)
    response.cookies.delete(AUTH_COOKIE_NAME)
    response.cookies.delete(AUTH_COOKIE_NAME_SECURE)
    return response
  }

  // 4. 관리자 전용 경로 체크
  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/work-records", request.url))
  }

  return NextResponse.next()
}

// 미들웨어가 적용될 경로 (이 경로들만 로그인 필요)
// 제외: /api/auth/*, /register, /_next/*, /favicon.ico, 정적 파일
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에 미들웨어 적용:
     * - api/auth (Auth.js 핸들러)
     * - register (회원가입)
     * - _next/static, _next/image (Next.js 정적 파일)
     * - favicon.ico, 이미지 등 정적 리소스
     */
    "/((?!api/auth|register|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}