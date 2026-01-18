import type { NextAuthConfig } from "next-auth"

// Edge 호환 설정 (Prisma, bcrypt 제외)
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      const isLoggedIn = !!auth?.user
      return isLoggedIn  // true면 허용, false면 /login으로
    },
  },
  providers: [],
} satisfies NextAuthConfig
