import type { Role } from "@/generated/prisma/client"

// JWT 토큰 페이로드 (accessToken에 포함되는 사용자 정보)
export interface AuthUser {
  id: string
  name: string
  loginId: string
  role: Role
}

// 서버 컴포넌트에서 사용하는 세션 타입
export interface AuthSession {
  user: AuthUser
}

// 로그인 API 응답
export interface LoginResponse {
  data: {
    user: AuthUser
    expiresAt: number  // accessToken 만료 시간 (epoch seconds)
  }
}

// 토큰 갱신 API 응답
export interface RefreshResponse {
  data: {
    expiresAt: number
    refreshTokenRotated: boolean
  }
}
