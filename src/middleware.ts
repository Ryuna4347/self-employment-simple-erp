import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

const { auth } = NextAuth(authConfig)

// 단순화된 미들웨어 - Auth.js authorized 콜백만 실행
export default auth

// 미들웨어가 적용될 경로 (이 경로들만 로그인 필요)
// 제외: /api/auth/*, /register, /_next/*, /favicon.ico, 정적 파일
export const config = {
  matcher: [
    /*
     * 아래 경로를 제외한 모든 경로에 미들웨어 적용:
     * - api/auth (Auth.js 핸들러)
     * - register (회원가입)
     * - api/cron (스케줄러 트리거)
     * - api/tax-invoices (외부 세금계산서 발급기 — X-API-Key로 라우트 자체에서 인증)
     * - _next/static, _next/image (Next.js 정적 파일)
     * - favicon.ico, 이미지 등 정적 리소스
     */
    "/((?!api/auth|api/register|api/cron|api/tax-invoices|register|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
}
