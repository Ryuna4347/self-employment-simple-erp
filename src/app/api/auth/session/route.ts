import { cookies } from "next/headers"
import { auth } from "@/auth"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie"

/**
 * GET /api/auth/session
 *
 * 현재 세션 정보 조회 API
 * - 로그인 상태 확인
 * - 사용자 정보 (id, name, loginId, role) 반환
 *
 * Note: /api/auth는 미들웨어 제외 경로이므로 여기서 session-check 쿠키 직접 확인
 * rememberMe=false인 경우 브라우저 종료 후 갱신 방지
 *
 * 응답:
 * - 200: 세션 정보 반환
 * - 401: 미인증 상태
 */
export async function GET() {
  // 미들웨어 제외 경로이므로 session-check 쿠키 직접 확인
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  if (!sessionCookie) {
    return ApiErrors.unauthorized("세션이 만료되었습니다")
  }

  const session = await auth()

  // 빈 객체 {}도 truthy이므로 user.id로 체크
  if (!session?.user?.id) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  return apiSuccess({
    user: {
      id: session.user.id,
      name: session.user.name,
      loginId: session.user.loginId,
      role: session.user.role,
    },
    // 클라이언트 토큰 만료 체크용 (갱신 후 새 만료 시간)
    accessTokenExpires: session.accessTokenExpires,
  })
}
