import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { authConfig } from "./auth.config"
import { createRefreshToken, rotateRefreshToken, revokeAllUserRefreshTokens } from "@/lib/tokens"
import { createSessionCookie, renewSessionCookie, destroySessionCookie, canModifyCookies } from "@/lib/session-cookie"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

const ACCESS_TOKEN_MAX_AGE = 60 * 60              // 1시간
const REFRESH_THRESHOLD = 30 * 60 * 1000          // 30분 (밀리초)

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
      const canModify = await canModifyCookies()
      const accessTokenExpires = token.accessTokenExpires as number | undefined
      const now = Date.now()

      console.log("[DEBUG jwt callback] ========== START ==========")
      console.log("[DEBUG jwt callback] 기본 정보:", {
        hasUser: !!user,
        tokenId: token.id,
        tokenError: token.error,
        canModifyCookies: canModify,
        hasRefreshToken: !!token.refreshToken,
      })
      console.log("[DEBUG jwt callback] 시간 정보:", {
        accessTokenExpires,
        accessTokenExpiresFormatted: accessTokenExpires ? new Date(accessTokenExpires).toISOString() : "undefined",
        now,
        nowFormatted: new Date(now).toISOString(),
        isExpired: accessTokenExpires === undefined ? "undefined (treated as expired)" : now >= accessTokenExpires,
        timeRemaining: accessTokenExpires ? Math.round((accessTokenExpires - now) / 1000) + "초" : "N/A",
      })

      // 1. 최초 로그인
      if (user) {
        console.log("[DEBUG jwt callback] >>> BRANCH: 최초 로그인 (user 있음)")
        const rememberMe = user.rememberMe ?? false
        console.log("[DEBUG jwt callback] createRefreshToken 호출 전, rememberMe:", rememberMe)
        const refreshTokenData = await createRefreshToken(user.id as string, rememberMe)
        console.log("[DEBUG jwt callback] createRefreshToken 완료, 토큰 생성됨:", !!refreshTokenData)

        // 세션 쿠키 생성 (rememberMe에 따라 세션/persistent)
        await createSessionCookie(rememberMe)

        const newAccessTokenExpires = Date.now() + ACCESS_TOKEN_MAX_AGE * 1000
        console.log("[DEBUG jwt callback] 새 accessTokenExpires 설정:", new Date(newAccessTokenExpires).toISOString())
        console.log("[DEBUG jwt callback] ========== END (로그인 완료) ==========")

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          rememberMe,
          refreshToken: refreshTokenData?.token ?? null,
          accessTokenExpires: newAccessTokenExpires,
        }
      }

      // 2. Access Token 아직 유효 → Sliding Session (30분 미만 남았을 때만 갱신)
      if (accessTokenExpires !== undefined && now < accessTokenExpires) {
        const timeRemaining = accessTokenExpires - now
        console.log("[DEBUG jwt callback] >>> BRANCH: Access Token 유효, 남은 시간:", Math.round(timeRemaining / 1000) + "초")

        // 남은 시간이 30분 미만일 때만 연장 (불필요한 JWT 재서명 방지)
        if (timeRemaining < REFRESH_THRESHOLD) {
          console.log("[DEBUG jwt callback] 30분 미만 남음, sliding session 시도")
          // 서버 컴포넌트에서는 쿠키 수정 불가 → 갱신 스킵
          if (!canModify) {
            console.log("[DEBUG jwt callback] 쿠키 수정 불가 (서버 컴포넌트), 스킵")
            console.log("[DEBUG jwt callback] ========== END ==========")
            return token
          }

          // iron-session 쿠키도 갱신 (rememberMe=true만)
          if (token.rememberMe) {
            await renewSessionCookie()
          }

          console.log("[DEBUG jwt callback] ========== END (sliding session) ==========")
          return {
            ...token,
            accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          }
        }

        console.log("[DEBUG jwt callback] ========== END (토큰 유효, 변경 없음) ==========")
        return token  // 변경 없음 (쿠키 재발급 안함)
      }

      // 여기 도달 = accessTokenExpires가 undefined이거나 만료됨
      console.log("[DEBUG jwt callback] >>> BRANCH: Access Token 만료 또는 undefined")
      console.log("[DEBUG jwt callback] accessTokenExpires === undefined:", accessTokenExpires === undefined)

      // 3. Access Token 만료 → 쿠키 수정 가능 여부 확인
      // 서버 컴포넌트에서는 JWT 쿠키 저장이 안 되므로 token rotation 하면 안 됨
      // (DB에서 토큰이 rotate되면 다음 요청에서 "Token reuse" 발생)
      if (!canModify) {
        // 서버 컴포넌트에서는 만료된 토큰 상태 그대로 유지 (에러 없이)
        // 실제 API 호출 시 (Route Handler에서) 갱신됨
        console.log("[DEBUG jwt callback] 쿠키 수정 불가 (서버 컴포넌트), rotation 스킵")
        console.log("[DEBUG jwt callback] ========== END ==========")
        return token
      }

      // 4. Access Token 만료 + Refresh Token 없음: 세션 종료
      if (!token.refreshToken) {
        console.log("[DEBUG jwt callback] Refresh Token 없음, 세션 만료 처리")
        console.log("[DEBUG jwt callback] ========== END ==========")
        return { ...token, error: "SessionExpired" as const }
      }

      // 5. Refresh Token으로 갱신 (Route Handler에서만 실행됨)
      console.log("[DEBUG jwt callback] >>> rotateRefreshToken 호출!")
      try {
        const [rotateResult, dbUser] = await Promise.all([
          rotateRefreshToken(token.refreshToken as string, token.id as string),
          prisma.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, isDeleted: true }
          })
        ])
        console.log("[DEBUG jwt callback] rotateRefreshToken 결과:", "error" in rotateResult ? rotateResult.error : "성공")

        // 토큰 재사용 감지
        if ("error" in rotateResult) {
          console.log("[DEBUG jwt callback] rotation 에러:", rotateResult.error)
          console.log("[DEBUG jwt callback] ========== END ==========")
          return { ...token, error: rotateResult.error === "REUSED" ? "TokenReused" as const : "RefreshTokenInvalid" as const }
        }

        if (!dbUser || dbUser.isDeleted) {
          console.log("[DEBUG jwt callback] 사용자 삭제됨")
          console.log("[DEBUG jwt callback] ========== END ==========")
          return { ...token, error: "UserDeleted" as const }
        }

        // Refresh Token 갱신 성공 시 iron-session도 갱신 (rememberMe=true만)
        if (token.rememberMe) {
          await renewSessionCookie()
        }

        console.log("[DEBUG jwt callback] rotation 성공, 새 토큰 발급됨")
        console.log("[DEBUG jwt callback] ========== END ==========")
        return {
          ...token,
          role: dbUser.role,
          refreshToken: rotateResult.newToken,
          accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          error: undefined,
        }
      } catch (error) {
        console.log("[DEBUG jwt callback] rotation 예외 발생:", error)
        console.log("[DEBUG jwt callback] ========== END ==========")
        return { ...token, error: "RefreshTokenInvalid" as const }
      }
    },
    // 세션에 JWT 정보 전달
    async session({ session, token }) {
      // 디버깅 로그
      console.log("[DEBUG session callback]", { tokenId: token.id, tokenError: token.error, tokenRole: token.role })

      // JWT의 error를 Session으로 전달 (필수!)
      if (token.error) {
        return { ...session, error: token.error }
      }

      // 토큰이 무효화된 경우 빈 세션 반환
      if (!token.id) {
        return { ...session, user: undefined as any }
      }

      session.user.id = token.id as string
      session.user.name = token.name as string
      session.user.loginId = token.loginId as string
      session.user.role = token.role as "ADMIN" | "USER"
      return session
    },
  },
  events: {
    async signOut(message) {
      // JWT 전략: message에 token이 있음
      if ("token" in message && message.token?.id) {
        // 사용자의 모든 활성 Refresh Token 폐기 (DB)
        await revokeAllUserRefreshTokens(message.token.id as string)
      }
      // iron-session 쿠키 삭제
      await destroySessionCookie()
    },
  },
})
