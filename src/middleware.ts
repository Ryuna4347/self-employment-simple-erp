import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

// 미들웨어가 적용될 경로 (이 경로들만 로그인 필요)
// 제외: /api/auth/*, /register, /login, /_next/*, /favicon.ico, 정적 파일
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에 미들웨어 적용:
     * - api/auth (Auth.js 핸들러)
     * - register (회원가입)
     * - login (로그인 페이지)
     * - _next/static, _next/image (Next.js 정적 파일)
     * - favicon.ico, 이미지 등 정적 리소스
     */
    "/((?!api/auth|register|login|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}