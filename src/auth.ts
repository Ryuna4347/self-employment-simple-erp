import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { cache } from "react"
import { authConfig } from "./auth.config"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

const ACCESS_TOKEN_MAX_AGE = 12 * 60 * 60  // 12시간 (초 단위)

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
        return {
          id: user.id,
          name: user.name,
          loginId: user.loginId,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: ACCESS_TOKEN_MAX_AGE,  // 12시간
  },
  callbacks: {
    // JWT 토큰에 사용자 정보 추가
    async jwt({ token, user }) {
      // 최초 로그인 시에만 토큰에 식별자(id)를 설정한다.
      // name/role 등 변동 가능한 필드는 session 콜백에서 매 호출마다 DB로부터 다시 읽으므로
      // 토큰에는 박제하지 않는다 (어드민의 변경이 재로그인 없이 반영되도록).
      if (user) {
        return {
          id: user.id,
          loginId: user.loginId,
        }
      }
      return token
    },
    // 세션에 사용자 정보 전달 — 매 요청마다 DB에서 최신 사용자 정보를 조회한다.
    // 이렇게 하면 어드민이 역할/이름을 바꾸거나 사용자를 soft-delete 했을 때
    // 해당 사용자의 다음 요청부터 즉시 반영된다.
    async session({ session, token }) {
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
