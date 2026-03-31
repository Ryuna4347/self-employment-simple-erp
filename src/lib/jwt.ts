import { SignJWT, jwtVerify } from "jose"
import type { AuthUser } from "@/types/auth"

// === 상수 ===
export const ACCESS_TOKEN_COOKIE = "access-token"
export const REFRESH_TOKEN_COOKIE = "refresh-token"

export const ACCESS_TOKEN_MAX_AGE = 1 * 60             // TODO: 테스트용 1분 (원래 30 * 60)
export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 // 7일 (초)
// export const REFRESH_RENEW_THRESHOLD = 3 * 24 * 60 * 60 // refreshToken 갱신 임계값 3일 (초) — 테스트용 주석처리

const IS_PRODUCTION = process.env.NODE_ENV === "production"

// HS256 서명을 위한 시크릿 키
function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다")
  return new TextEncoder().encode(secret)
}

// === JWT 서명/검증 ===

/**
 * accessToken JWT 생성 (30분 만료)
 * @returns JWT 문자열 + 만료 시간 (epoch seconds)
 */
export async function signAccessToken(
  user: AuthUser
): Promise<{ token: string; expiresAt: number }> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + ACCESS_TOKEN_MAX_AGE

  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    loginId: user.loginId,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(getSecret())

  return { token, expiresAt }
}

/**
 * accessToken 검증 (서명 + 만료 모두 확인)
 * API 라우트에서 사용
 */
export async function verifyAccessToken(token: string): Promise<AuthUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.id) return null

    return {
      id: payload.id as string,
      name: (payload.name as string) || "",
      loginId: (payload.loginId as string) || "",
      role: (payload.role as AuthUser["role"]) || "USER",
    }
  } catch {
    return null
  }
}

/**
 * accessToken 서명만 검증 (만료 무시)
 * 미들웨어에서 사용 - 만료된 토큰도 통과시키기 위함
 */
export async function verifyAccessTokenIgnoreExpiration(
  token: string
): Promise<AuthUser | null> {
  try {
    // 먼저 서명 유효성 확인 (만료 무시 옵션)
    const { payload } = await jwtVerify(token, getSecret(), {
      clockTolerance: Number.MAX_SAFE_INTEGER, // 만료 시간 무시
    })
    if (!payload.id) return null

    return {
      id: payload.id as string,
      name: (payload.name as string) || "",
      loginId: (payload.loginId as string) || "",
      role: (payload.role as AuthUser["role"]) || "USER",
    }
  } catch {
    return null
  }
}

// === 쿠키 옵션 ===

/**
 * accessToken 쿠키 설정 옵션
 */
export function getAccessTokenCookieOptions() {
  return {
    name: ACCESS_TOKEN_COOKIE,
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  }
}

/**
 * refreshToken 쿠키 설정 옵션
 * Path를 /api/auth로 제한하여 불필요한 전송 방지
 */
export function getRefreshTokenCookieOptions() {
  return {
    name: REFRESH_TOKEN_COOKIE,
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax" as const,
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  }
}
