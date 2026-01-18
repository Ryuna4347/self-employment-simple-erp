import NextAuth from "next-auth"
import { authConfig } from "./auth.config"

export default NextAuth(authConfig).auth

// 미들웨어가 적용될 경로 (이 경로들만 로그인 필요)
export const config = {
  matcher: ["/"]  // 홈페이지만 보호 (테스트용)
}