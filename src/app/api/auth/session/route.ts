import { cookies } from "next/headers"
import { ACCESS_TOKEN_COOKIE, verifyAccessToken } from "@/lib/jwt"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

/**
 * GET /api/auth/session
 *
 * 현재 세션 정보 조회 API
 * - accessToken JWT를 디코딩하여 사용자 정보 반환
 *
 * 응답:
 * - 200: 세션 정보 반환
 * - 401: 미인증 상태
 */
export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value

  if (!token) {
    return ApiErrors.unauthorized("로그인이 필요합니다")
  }

  const user = await verifyAccessToken(token)
  if (!user) {
    return ApiErrors.unauthorized("인증 정보가 유효하지 않습니다")
  }

  return apiSuccess({
    user: {
      id: user.id,
      name: user.name,
      loginId: user.loginId,
      role: user.role,
    },
  })
}
