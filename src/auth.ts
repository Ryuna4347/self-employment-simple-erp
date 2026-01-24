import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { authConfig } from "./auth.config"
// 타입 확장은 src/types/next-auth.d.ts에서 처리

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma as any),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        id: { label: "ID", type: "text", placeholder: "아이디 입력" },
        password: { label: "Password", type: "password", placeholder: "비밀번호 입력" }
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
    maxAge: 7 * 24 * 60 * 60, // 7일 (초 단위)
  },
  callbacks: {
    // JWT 토큰에 사용자 정보 추가
    async jwt({ token, user, trigger }) {
      // 최초 로그인 시 사용자 정보를 토큰에 저장
      if (user) {
        token.id = user.id as string
        token.loginId = user.loginId
        token.role = user.role
      }

      // 세션 업데이트 트리거 시 DB에서 최신 정보 조회 (역할 변경 등 반영)
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, isDeleted: true }
        })

        // 삭제된 사용자는 토큰 무효화 (빈 객체 반환 시 세션 종료)
        if (!dbUser || dbUser.isDeleted) {
          return {} as typeof token
        }

        token.role = dbUser.role
      }

      return token
    },
    // 세션에 JWT 정보 전달
    async session({ session, token }) {
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

