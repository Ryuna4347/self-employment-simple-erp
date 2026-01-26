import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"

// Edge 호환 설정 (Prisma, bcrypt 제외)
export const authConfig = {
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Edge Runtime에서는 auth.user가 빈 객체 {}로 전달됨
      // user.id 체크는 불가하므로 user 존재 여부만 확인
      // 상세 검증은 (authenticated) layout에서 수행
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // 로그인 페이지 접근 시: 이미 로그인된 사용자는 메인으로 리다이렉트
      if (pathname === "/") {
        if (isLoggedIn) {
          return NextResponse.redirect(new URL("/work-records", nextUrl))
        }
        // 로그인 페이지는 비로그인 사용자에게 허용
        return true
      }

      // 비로그인 시 로그인 페이지로 (callbackUrl 없이)
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/", nextUrl))
      }

      // 관리자 전용 경로 체크
      // JWT의 role 체크 (Edge에서는 token 직접 접근 불가, 별도 처리 필요)
      // 상세 권한 체크는 각 페이지/API에서 수행
      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
