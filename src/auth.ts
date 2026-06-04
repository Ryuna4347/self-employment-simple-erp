import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { cache } from "react"
import { authConfig } from "./auth.config"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

// 자동로그인("로그인 상태 유지") 체크 시: 7일 슬라이딩 세션의 상한.
// 전역 session.maxAge(쿠키 물리 수명)로 사용한다. (유휴 7일 허용을 위해 필수)
const REMEMBER_MAX_AGE = 7 * 24 * 60 * 60  // 7일 (초 단위)
// 미체크 시: 12시간 고정 세션. 쿠키가 아닌 토큰 내 expiresAt claim으로 강제한다.
const FIXED_MAX_AGE = 12 * 60 * 60  // 12시간 (초 단위)
// 자동로그인 슬라이딩 시 expiresAt를 다시 계산·연장하는 최소 간격.
// 이 간격 이내의 요청은 토큰을 그대로 반환하므로(멱등) 동시 다발 요청에도 재계산이 없다.
// 갱신 경로 자체에 DB 쓰기·토큰 회전이 없어 갱신 폭주·연쇄 로그아웃이 구조적으로 불가능하다.
const SLIDE_THROTTLE = 60 * 60  // 1시간 (초 단위)

// 동일 요청 내에서 auth()가 여러 번 호출돼도 DB 조회를 한 번으로 dedupe
const getFreshUserById = cache(async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      loginId: true,
      role: true,
      isDeleted: true,
    },
  })
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
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
        // rememberMe는 Credentials 특성상 문자열("true"/"false")로 전달되므로 === 비교
        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
          rememberMe: credentials.rememberMe === "true",
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    // 쿠키 물리 수명의 상한은 7일(자동로그인 최대 창). 미체크(12시간) 세션은
    // 아래 session 콜백의 expiresAt claim으로 더 짧게 강제한다.
    // (참고: NextAuth JWT 전략은 미들웨어/세션요청마다 쿠키를 재발급하지만,
    //  그 갱신 경로에 DB 쓰기가 없으므로 동시 요청이 몰려도 폭주하지 않는다.
    //  updateAge는 JWT 전략에선 재발급을 스로틀하지 않으므로 설정하지 않는다.)
    maxAge: REMEMBER_MAX_AGE,
  },
  callbacks: {
    // JWT 토큰 발급/재발급
    async jwt({ token, user }) {
      // 1) 최초 로그인: 식별자 + rememberMe + 만료시각(expiresAt, epoch ms)을 설정한다.
      //    name/role 등 변동 가능한 필드는 session 콜백에서 매 호출마다 DB로부터 다시 읽으므로
      //    토큰에는 박제하지 않는다 (어드민의 변경이 재로그인 없이 반영되도록).
      if (user) {
        const rememberMe = user.rememberMe === true
        const maxAge = rememberMe ? REMEMBER_MAX_AGE : FIXED_MAX_AGE
        return {
          id: user.id,
          loginId: user.loginId,
          rememberMe,
          expiresAt: Date.now() + maxAge * 1000,
        }
      }

      // 2) 이후 요청: 자동로그인(rememberMe) 세션만 expiresAt를 슬라이딩 연장한다.
      //    - 미체크 세션은 그대로 통과 → expiresAt(12시간) 고정.
      //    - 이미 만료된 세션은 갱신하지 않는다(부활 방지). 만료 강제는 session 콜백이 담당.
      //    - 남은 창이 SLIDE_THROTTLE 이상 줄었을 때만 expiresAt를 재계산한다.
      //      → 그 외 요청은 token을 그대로 반환 → 동시 다발 요청이 와도 멱등(재계산 없음).
      //        갱신 경로에 DB 쓰기/토큰 회전이 전혀 없어 갱신 폭주·연쇄 로그아웃이 불가능.
      if (token.rememberMe === true && typeof token.expiresAt === "number") {
        const now = Date.now()
        if (now <= token.expiresAt) {
          const next = now + REMEMBER_MAX_AGE * 1000
          if (next - token.expiresAt > SLIDE_THROTTLE * 1000) {
            return { ...token, expiresAt: next }
          }
        }
      }
      return token
    },
    // 세션에 사용자 정보 전달 — 매 요청마다 DB에서 최신 사용자 정보를 조회한다.
    // 이렇게 하면 어드민이 역할/이름을 바꾸거나 사용자를 soft-delete 했을 때
    // 해당 사용자의 다음 요청부터 즉시 반영된다.
    async session({ session, token }) {
      // 만료 강제: 토큰의 expiresAt(자동로그인 7일 / 미체크 12시간)이 지났으면 빈 세션 반환.
      // 전역 쿠키 수명은 7일이지만, 12시간 고정 세션은 이 검사로 차단된다.
      // → layout.tsx redirect / API 가드 401 경로를 그대로 재사용.
      // ※ expiresAt가 없는 레거시 토큰(이 변경 배포 이전 로그인)은 검사를 건너뛰어
      //   강제 로그아웃 없이 기존 DB 검사로 통과시킨다(무중단 점진 전환).
      if (typeof token.expiresAt === "number" && Date.now() > token.expiresAt) {
        return { ...session, user: undefined as unknown as typeof session.user }
      }

      const tokenId = typeof token.id === "string" ? token.id : null
      const freshUser = tokenId ? await getFreshUserById(tokenId) : null

      // 토큰 무효 / DB에 없음 / soft-delete 된 경우 빈 세션 반환
      // → layout.tsx의 `!session.user.id` 분기에서 /?sessionExpired=true 로 redirect
      // → API 가드(requireAuth 등)는 401 반환
      if (!freshUser || freshUser.isDeleted) {
        return { ...session, user: undefined as unknown as typeof session.user }
      }

      session.user.id = freshUser.id
      session.user.name = freshUser.name
      session.user.loginId = freshUser.loginId
      session.user.role = freshUser.role
      return session
    },
  },
})
