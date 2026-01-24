import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"

// Edge 호환 설정 (Prisma, bcrypt 제외)
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // 로그인 페이지 접근 시: 이미 로그인된 사용자는 메인으로 리다이렉트
      if (pathname === "/login" || pathname === "/") {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/work-records", nextUrl))
        }
        // 로그인 페이지는 비로그인 사용자에게 허용
        return true
      }

      // 관리자 전용 경로 체크
      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false
        // JWT의 role 체크 (Edge에서는 token 직접 접근 불가, 별도 처리 필요)
        // 상세 권한 체크는 각 페이지/API에서 수행
        return true
      }

      // 그 외 보호된 경로: 로그인 필요
      return isLoggedIn
    },
  },
  providers: [],
} satisfies NextAuthConfig
