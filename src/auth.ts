import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { authConfig } from "./auth.config"
import { createRefreshToken, rotateRefreshToken, revokeAllUserRefreshTokens } from "@/lib/tokens"
import { createSessionCookie, renewSessionCookie, destroySessionCookie } from "@/lib/session-cookie"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

const ACCESS_TOKEN_MAX_AGE = 60 * 60                    // 1시간
const ACCESS_TOKEN_REFRESH_THRESHOLD = 15 * 60 * 1000   // 15분 (밀리초) - Access Token 갱신 임계값
const REFRESH_TOKEN_ROTATION_AGE = 24 * 60 * 60 * 1000  // 1일 (밀리초) - Refresh Token 재발급 임계값

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
    // Note: auth()는 Route Handler에서만 호출됨 (서버 컴포넌트에서는 getSessionFromJWT 사용)
    async jwt({ token, user }) {
      const accessTokenExpires = token.accessTokenExpires as number | undefined
      const now = Date.now()

      // 1. 최초 로그인
      if (user) {
        const rememberMe = user.rememberMe ?? false
        const refreshTokenData = await createRefreshToken(user.id as string, rememberMe)

        // 세션 쿠키 생성 (rememberMe에 따라 세션/persistent)
        await createSessionCookie(rememberMe)

        const newAccessTokenExpires = Date.now() + ACCESS_TOKEN_MAX_AGE * 1000

        console.log(`[Auth] 로그인 성공: userId=${user.id}, rememberMe=${rememberMe}, hasRefreshToken=${!!refreshTokenData}`)

        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          rememberMe,
          refreshToken: refreshTokenData?.token ?? null,
          refreshTokenIssuedAt: refreshTokenData?.createdAt.getTime() ?? null,
          accessTokenExpires: newAccessTokenExpires,
        }
      }

      // 2. Access Token 아직 유효 → Sliding Session (15분 미만 남았을 때만 갱신)
      if (accessTokenExpires !== undefined && now < accessTokenExpires) {
        const timeRemaining = accessTokenExpires - now

        // 남은 시간이 15분 미만일 때만 연장 (불필요한 JWT 재서명 방지)
        if (timeRemaining < ACCESS_TOKEN_REFRESH_THRESHOLD) {
          console.log(`[Auth] Access Token 슬라이딩: userId=${token.id}, 남은시간=${Math.round(timeRemaining / 1000)}초`)

          let newRefreshToken = token.refreshToken as string | null
          let newRefreshTokenIssuedAt = token.refreshTokenIssuedAt as number | undefined

          // Refresh Token 1일 이상 사용 시 rotation (rememberMe=true만)
          if (token.rememberMe && token.refreshToken && token.refreshTokenIssuedAt) {
            const refreshTokenAge = now - (token.refreshTokenIssuedAt as number)
            if (refreshTokenAge >= REFRESH_TOKEN_ROTATION_AGE) {
              console.log(`[Auth] Refresh Token rotation 시작 (슬라이딩): userId=${token.id}, 사용기간=${Math.round(refreshTokenAge / 1000 / 60 / 60)}시간`)
              try {
                const rotateResult = await rotateRefreshToken(
                  token.refreshToken as string,
                  token.id as string
                )
                if (!("error" in rotateResult)) {
                  newRefreshToken = rotateResult.newToken
                  newRefreshTokenIssuedAt = rotateResult.createdAt.getTime()
                  console.log(`[Auth] Refresh Token rotation 성공 (슬라이딩): userId=${token.id}`)
                } else {
                  console.log(`[Auth] Refresh Token rotation 실패 (슬라이딩): userId=${token.id}, error=${rotateResult.error}`)
                }
              } catch (e) {
                console.error(`[Auth] Refresh Token rotation 예외 (슬라이딩): userId=${token.id}`, e)
              }
            }
          }

          // iron-session 쿠키도 갱신 (rememberMe=true만)
          if (token.rememberMe) {
            await renewSessionCookie()
          }

          return {
            ...token,
            refreshToken: newRefreshToken,
            refreshTokenIssuedAt: newRefreshTokenIssuedAt,
            accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          }
        }

        return token  // 변경 없음 (쿠키 재발급 안함)
      }

      // 3. Access Token 만료 + Refresh Token 없음: 세션 종료
      if (!token.refreshToken) {
        console.log(`[Auth] 세션 만료: userId=${token.id}, Refresh Token 없음`)
        return { ...token, error: "SessionExpired" as const }
      }

      // 4. Refresh Token으로 갱신 (Route Handler에서만 실행됨)
      console.log(`[Auth] Access Token 만료, Refresh Token으로 갱신 시도: userId=${token.id}`)
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
          console.error(`[Auth] Refresh Token 갱신 실패: userId=${token.id}, error=${rotateResult.error}`)
          return { ...token, error: rotateResult.error === "REUSED" ? "TokenReused" as const : "RefreshTokenInvalid" as const }
        }

        if (!dbUser || dbUser.isDeleted) {
          console.log(`[Auth] 사용자 삭제됨: userId=${token.id}`)
          return { ...token, error: "UserDeleted" as const }
        }

        // Refresh Token 갱신 성공 시 iron-session도 갱신 (rememberMe=true만)
        if (token.rememberMe) {
          await renewSessionCookie()
        }

        console.log(`[Auth] Refresh Token 갱신 성공: userId=${token.id}`)

        return {
          ...token,
          role: dbUser.role,
          refreshToken: rotateResult.newToken,
          refreshTokenIssuedAt: rotateResult.createdAt.getTime(),
          accessTokenExpires: Date.now() + ACCESS_TOKEN_MAX_AGE * 1000,
          error: undefined,
        }
      } catch (e) {
        console.error(`[Auth] Refresh Token 갱신 예외: userId=${token.id}`, e)
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
