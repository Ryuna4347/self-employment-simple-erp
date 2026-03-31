import { NextRequest, NextResponse } from "next/server"
import { ACCESS_TOKEN_COOKIE, verifyAccessTokenIgnoreExpiration } from "@/lib/jwt"

/**
 * 커스텀 미들웨어
 *
 * - accessToken 서명만 검증 (만료 무시)
 * - 만료된 토큰도 통과시킴 → API 라우트에서 403 반환 → 프론트에서 갱신 처리
 * - 토큰 없거나 서명 무효 → 로그인 페이지로 리다이렉트
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value

  // 로그인 페이지 접근 시
  if (pathname === "/") {
    const isSessionExpired = request.nextUrl.searchParams.get("sessionExpired") === "true"

    // 유효한 토큰이 있고, 세션 만료 리다이렉트가 아닌 경우 → 메인으로 이동
    if (token && !isSessionExpired) {
      const user = await verifyAccessTokenIgnoreExpiration(token)
      if (user) {
        return NextResponse.redirect(new URL("/work-records", request.url))
      }
    }

    return NextResponse.next()
  }

  // 토큰 없음 → 로그인 페이지로
  if (!token) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // 서명 검증 (만료 무시)
  const user = await verifyAccessTokenIgnoreExpiration(token)
  if (!user) {
    // 서명이 유효하지 않은 토큰 → 로그인 페이지로
    return NextResponse.redirect(new URL("/?sessionExpired=true", request.url))
  }

  // 통과 (만료 여부와 무관)
  return NextResponse.next()
}

// 미들웨어가 적용될 경로
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에 미들웨어 적용:
     * - api/auth (인증 API - login/refresh/logout)
     * - api/register (회원가입 API)
     * - register (회원가입 페이지)
     * - _next/static, _next/image (Next.js 정적 파일)
     * - favicon.ico, 이미지 등 정적 리소스
     */
    "/((?!api/auth|api/register|register|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}
