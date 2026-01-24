import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { authConfig } from "./auth.config"
import { createRefreshToken, rotateRefreshToken } from "@/lib/tokens"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

const ACCESS_TOKEN_MAX_AGE = 60 * 60              // 1시간
const REFRESH_THRESHOLD = 30 * 60 * 1000          // 30분 (밀리초)
const ABSOLUTE_MAX_AGE_NO_REMEMBER = 18 * 60 * 60 * 1000  // 18시간 (rememberMe=false)

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        id: { label: "ID", type: "text", placeholder: "아이디 입력" },
        password: { label: "Password", type: "password", placeholder: "비밀번호 입력" },
        rememberMe: { label: "Remember Me", type: "checkbox" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.password) return null

        const loginId = credentials.id as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { loginId }
        })

        // 사용자 없음 또는 비밀번호 미설정(초대 대기 상태)
        if (!user?.password) return null

        // 삭제된 사용자 체크
        if (user.isDeleted) return null

        const isPasswordValid = await bcrypt.compare(password, user.password)
        if (!isPasswordValid) return null

        // JWT에 포함될 사용자 정보 반환
        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          rememberMe: credentials?.rememberMe === "true",
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7일 (초 단위)
  },
  callbacks: {
    // JWT 토큰에 사용자 정보 추가
    async jwt({ token, user }) {
      // 1. 최초 로그인
      if (user) {
        const rememberMe = user.rememberMe ?? false
        const refreshTokenData = await createRefreshToken(user.id as string, rememberMe)

        return {
          id: user.id,
          loginId: user.loginId,
          role: user.role,
          rememberMe,
          refreshToken: refreshTokenData?.token ?? null,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          // rememberMe=false만 절대 만료 설정 (18시간)
          absoluteExpires: rememberMe ? undefined : Date.now() + ABSOLUTE_MAX_AGE_NO_REMEMBER,
        }
      }

      // 2. 절대 만료 시간 체크 (rememberMe=false만 해당)
      if (token.absoluteExpires && Date.now() >= (token.absoluteExpires as number)) {
        return { ...token, error: "SessionExpired" as const }
      }

      // 3. Access Token 아직 유효 → Sliding Session (30분 미만 남았을 때만 갱신)
      const accessTokenExpires = token.accessTokenExpires as number | undefined
      if (Date.now() < (accessTokenExpires ?? 0)) {
        const timeRemaining = (accessTokenExpires as number) - Date.now()

        // 남은 시간이 30분 미만일 때만 연장 (불필요한 JWT 재서명 방지)
        if (timeRemaining < REFRESH_THRESHOLD) {
          return {
            ...token,
            accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          }
        }

        return token  // 변경 없음 (쿠키 재발급 안함)
      }

      // 4. Access Token 만료 + Refresh Token 없음: 세션 종료
      if (!token.refreshToken) {
        return { ...token, error: "SessionExpired" as const }
      }

      // 5. Refresh Token으로 갱신 (Promise.all 병렬 처리)
      try {
        const [rotateResult, dbUser] = await Promise.all([
          rotateRefreshToken(token.refreshToken as string, token.id as string),
          prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isDeleted: true }
          })
        ])

        // 토큰 재사용 감지
        if ("error" in rotateResult) {
          return { ...token, error: rotateResult.error === "REUSED" ? "TokenReused" as const : "RefreshTokenInvalid" as const }
        }

        if (!dbUser || dbUser.isDeleted) {
          return { ...token, error: "UserDeleted" as const }
        }

        return {
          ...token,
          role: dbUser.role,
          refreshToken: rotateResult.newToken,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          error: undefined,
        }
      } catch {
        return { ...token, error: "RefreshTokenInvalid" as const }
      }
    },
    // 세션에 JWT 정보 전달
    async session({ session, token }) {
      // JWT의 error를 Session으로 전달 (필수!)
      if (token.error) {
        return { ...session, error: token.error }
      }

      // 토큰이 무효화된 경우 빈 세션 반환
      if (!token.id) {
        return { ...session, user: undefined as any }
      }

      session.user.id = token.id as string
      session.user.loginId = token.loginId as string
      session.user.role = token.role as "ADMIN" | "USER"
      return session
    },
  },
})
