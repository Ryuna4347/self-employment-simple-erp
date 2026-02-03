import { auth } from "@/auth"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

/**
 * GET /api/auth/session
 *
 * 현재 세션 정보 조회 API
 * - 로그인 상태 확인
 * - 사용자 정보 (id, name, loginId, role) 반환
 * - accessTokenExpires 반환 (클라이언트 토큰 만료 체크용)
 *
 * Note: session-check 쿠키 체크는 미들웨어에서 처리
 * 로그인 직후에는 /api/auth/init-session을 통해 설정됨
 *
 * 응답:
 * - 200: 세션 정보 반환
 * - 401: 미인증 상태
 */
export async function GET() {
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
