import { auth } from "@/auth"
import { ApiErrors } from "@/lib/api-response"
import type { Role } from "@/generated/prisma/client"
import type { Session } from "next-auth"

// 세션에서 user 타입 추출
type SessionUser = NonNullable<Session["user"]>

interface AuthResult {
  session: Session
  user: SessionUser
}

/**
 * API 라우트에서 인증 확인 헬퍼
 *
 * 사용 예시:
 * ```ts
 * export async function GET() {
 *   const authResult = await requireAuth()
 *   if (authResult instanceof NextResponse) return authResult
 *
 *   const { user } = authResult
 *   // user.id, user.role 등 사용 가능
 * }
 * ```
 */
export async function requireAuth(): Promise<AuthResult | ReturnType<typeof ApiErrors.unauthorized>> {
  const session = await auth()

  // session.error 체크 (TokenReused, SessionExpired, UserDeleted 등)
  if (session?.error) {
    return ApiErrors.unauthorized(`세션 오류: ${session.error}`)
  }

  if (!session?.user) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  return { session, user: session.user }
}

/**
 * API 라우트에서 관리자 권한 확인 헬퍼
 *
 * 사용 예시:
 * ```ts
 * export async function POST() {
 *   const authResult = await requireAdmin()
 *   if (authResult instanceof NextResponse) return authResult
 *
 *   // 관리자만 접근 가능한 로직
 * }
 * ```
 */
export async function requireAdmin(): Promise<AuthResult | ReturnType<typeof ApiErrors.unauthorized> | ReturnType<typeof ApiErrors.adminRequired>> {
  const session = await auth()

  // session.error 체크 (TokenReused, SessionExpired, UserDeleted 등)
  if (session?.error) {
    return ApiErrors.unauthorized(`세션 오류: ${session.error}`)
  }

  if (!session?.user) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  if (session.user.role !== "ADMIN") {
    return ApiErrors.adminRequired("관리자 권한이 필요합니다")
  }

  return { session, user: session.user }
}

/**
 * 특정 역할 체크 헬퍼
 */
export async function requireRole(
  allowedRoles: Role[]
): Promise<AuthResult | ReturnType<typeof ApiErrors.unauthorized> | ReturnType<typeof ApiErrors.forbidden>> {
  const session = await auth()

  // session.error 체크 (TokenReused, SessionExpired, UserDeleted 등)
  if (session?.error) {
    return ApiErrors.unauthorized(`세션 오류: ${session.error}`)
  }

  if (!session?.user) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  if (!allowedRoles.includes(session.user.role)) {
    return ApiErrors.forbidden("접근 권한이 없습니다")
  }

  return { session, user: session.user }
}

/**
 * NextResponse 인스턴스인지 확인하는 타입 가드
 */
export function isErrorResponse(
  result: AuthResult | ReturnType<typeof ApiErrors.unauthorized> | ReturnType<typeof ApiErrors.adminRequired> | ReturnType<typeof ApiErrors.forbidden>
): result is ReturnType<typeof ApiErrors.unauthorized> {
  return result instanceof Response
}
