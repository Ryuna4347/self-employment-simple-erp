import type { NextAuthConfig } from "next-auth"
import { NextResponse } from "next/server"

// 자동로그인 슬라이딩 세션의 최대 유휴 기간(= JWT 쿠키 수명).
// 미들웨어의 NextAuth 네이티브 롤링이 보호 라우트 접속마다 이 값으로 쿠키를 재발급하므로,
// 실질적인 7일 슬라이딩(접속 시 기간 갱신)이 여기서 구현된다. (auth.ts와 공유)
export const REMEMBER_MAX_AGE = 7 * 24 * 60 * 60  // 7일 (초 단위)

// Edge 호환 설정 (Prisma, bcrypt 제외)
export const authConfig = {
  pages: {
    signIn: "/",
  },
  // JWT 세션 + 7일 슬라이딩. maxAge 미설정 시 기본 30일이 적용되므로 명시한다.
  // (미들웨어가 접속마다 쿠키를 now+maxAge로 롤링 → 자동로그인 기간 갱신)
  session: {
    strategy: "jwt",
    maxAge: REMEMBER_MAX_AGE,
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      // Edge Runtime에서는 auth.user가 빈 객체 {}로 전달됨
      // user.id 체크는 불가하므로 user 존재 여부만 확인
      // 상세 검증은 (authenticated) layout에서 수행
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname

      // 로그인 페이지 접근 시: 이미 로그인된 사용자는 메인으로 리다이렉트
      // 단, sessionExpired=true인 경우는 세션 만료로 리다이렉트된 것이므로 로그인 페이지 표시
      if (pathname === "/") {
        const isSessionExpired =
          nextUrl.searchParams.get("sessionExpired") === "true"
        if (isLoggedIn && !isSessionExpired) {
          return NextResponse.redirect(new URL("/work-records", nextUrl))
        }
        // 로그인 페이지는 비로그인 사용자 또는 세션 만료 사용자에게 허용
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
