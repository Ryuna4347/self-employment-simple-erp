import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  REFRESH_TOKEN_COOKIE,
  signAccessToken,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
} from "@/lib/jwt"
import {
  validateRefreshToken,
  needsRefreshTokenRotation,
  deleteRefreshToken,
  generateRefreshToken,
  createRefreshToken,
} from "@/lib/token-service"
import { apiError, ErrorCode } from "@/lib/api-response"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshTokenValue = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    if (!refreshTokenValue) {
      return apiError(ErrorCode.UNAUTHORIZED, "인증 정보가 없습니다", 401)
    }

    // refreshToken 검증 (DB 조회 + 만료 체크 + 유저 유효성)
    const record = await validateRefreshToken(refreshTokenValue)
    if (!record) {
      return apiError(ErrorCode.UNAUTHORIZED, "인증 정보가 만료되었습니다", 401)
    }

    // 새 accessToken 발급
    const authUser = {
      id: record.User.id,
      name: record.User.name,
      loginId: record.User.loginId,
      role: record.User.role,
    }
    const { token: newAccessToken, expiresAt } = await signAccessToken(authUser)

    // refreshToken 갱신 여부 결정
    let refreshTokenRotated = false
    let newRefreshTokenValue: string | null = null

    if (needsRefreshTokenRotation(record.expiresAt, record.rememberMe)) {
      // 기존 refreshToken 삭제
      await deleteRefreshToken(record.tokenHash)

      // 새 refreshToken 생성 + DB 저장
      newRefreshTokenValue = generateRefreshToken()
      await createRefreshToken(record.userId, newRefreshTokenValue, record.rememberMe)
      refreshTokenRotated = true
    }

    // 응답 생성
    const response = NextResponse.json({
      data: {
        expiresAt,
        refreshTokenRotated,
      },
    })

    // accessToken 쿠키 갱신
    const accessOpts = getAccessTokenCookieOptions()
    response.cookies.set(accessOpts.name, newAccessToken, accessOpts)

    // refreshToken도 갱신된 경우 쿠키 갱신
    if (newRefreshTokenValue) {
      const refreshOpts = getRefreshTokenCookieOptions()
      response.cookies.set(refreshOpts.name, newRefreshTokenValue, refreshOpts)
    }

    return response
  } catch {
    return apiError(ErrorCode.INTERNAL_ERROR, "토큰 갱신 중 오류가 발생했습니다", 500)
  }
}
