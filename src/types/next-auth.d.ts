import type { Role } from "@/generated/prisma/client"

// 세션 에러 타입 정의
type SessionError = "SessionExpired" | "RefreshTokenInvalid" | "TokenReused" | "UserDeleted"

declare module "next-auth" {
  interface User {
    loginId?: string
    role?: Role
    rememberMe?: boolean
  }

  interface Session {
    user: {
      id: string
      name: string
      loginId: string
      role: Role
    }
    error?: SessionError  // 세션 에러 전달용
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    loginId?: string
    role?: Role
    rememberMe?: boolean
    refreshToken?: string | null
    accessTokenExpires?: number
    error?: SessionError
  }
}
