import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "@/lib/jwt"
import { ApiErrors, apiError, ErrorCode } from "@/lib/api-response"
import type { Role } from "@/generated/prisma/client"
import type { AuthUser, AuthSession } from "@/types/auth"

interface AuthResult {
  session: AuthSession
  user: AuthUser
}

/**
 * API 라우트에서 인증 확인 헬퍼
 *
 * - accessToken 쿠키를 읽고 JWT 검증
 * - 토큰 없음 → 401
 * - 토큰 만료/무효 → 403 (프론트에서 갱신 트리거)
 */
export async function requireAuth(): Promise<AuthResult | Response> {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!token) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  const user = await verifyAccessToken(token)
  if (!user) {
    // 토큰 만료 또는 무효 → 403 (프론트에서 refresh 시도)
    return apiError(ErrorCode.SESSION_EXPIRED, "인증이 만료되었습니다", 403)
  }

  return { session: { user }, user }
}

/**
 * API 라우트에서 관리자 권한 확인 헬퍼
 */
export async function requireAdmin(): Promise<AuthResult | Response> {
  const result = await requireAuth()
  if (result instanceof Response) return result

  if (result.user.role !== "ADMIN") {
    return ApiErrors.adminRequired("관리자 권한이 필요합니다")
  }

  return result
}

/**
 * 특정 역할 체크 헬퍼
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<AuthResult | Response> {
  const result = await requireAuth()
  if (result instanceof Response) return result

  if (!allowedRoles.includes(result.user.role)) {
    return ApiErrors.forbidden("접근 권한이 없습니다")
  }

  return result
}

/**
 * Response 인스턴스인지 확인하는 타입 가드
 */
export function isErrorResponse(
  result: AuthResult | Response
): result is Response {
  return result instanceof Response
}
