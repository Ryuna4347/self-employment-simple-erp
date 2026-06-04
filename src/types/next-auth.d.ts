import type { Role } from "@/generated/prisma/client"

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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    loginId?: string
    role?: Role
    rememberMe?: boolean
    expiresAt?: number
  }
}
