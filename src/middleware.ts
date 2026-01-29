import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie"

const { auth } = NextAuth(authConfig)

// Auth.js 세션 쿠키 이름 (개발/프로덕션)
const AUTH_COOKIE_NAME = "authjs.session-token"
const AUTH_COOKIE_NAME_SECURE = "__Secure-authjs.session-token"

// 세션 쿠키 체크 미들웨어
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 로그인/회원가입 페이지는 세션 쿠키 체크 안함
  if (pathname === "/" || pathname.startsWith("/register")) {
    return auth(request as any)
  }

  // 세션 체크 쿠키 확인
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

  if (!sessionCookie) {
    // 세션 쿠키 없음 = 브라우저 닫았거나 만료
    // Auth.js 쿠키도 삭제하여 무한 리디렉션 방지
    const url = new URL("/", request.url)
    url.searchParams.set("sessionExpired", "true")
    const response = NextResponse.redirect(url)

    // Auth.js 쿠키 삭제 (개발/프로덕션 모두 처리)
    response.cookies.delete(AUTH_COOKIE_NAME)
    response.cookies.delete(AUTH_COOKIE_NAME_SECURE)

    return response
  }

  // 세션 쿠키 있으면 기존 Auth.js authorized 콜백 진행
  return auth(request as any)
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