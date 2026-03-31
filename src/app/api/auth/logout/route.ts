import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import {
  REFRESH_TOKEN_COOKIE,
  ACCESS_TOKEN_COOKIE,
} from "@/lib/jwt"
import { hashToken, deleteRefreshToken } from "@/lib/token-service"
import { apiError, ErrorCode } from "@/lib/api-response"

export async function POST() {
  try {
    const cookieStore = await cookies()
    const refreshTokenValue = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value

    // DB에서 refreshToken 삭제
    if (refreshTokenValue) {
      const tokenHash = hashToken(refreshTokenValue)
      await deleteRefreshToken(tokenHash)
    }

    // 응답 생성
    const response = NextResponse.json({
      data: { success: true },
    })

    // 두 쿠키 모두 제거
    response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    })
    response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
      httpOnly: true,
      path: "/api/auth",
      maxAge: 0,
    })

    return response
  } catch {
    return apiError(ErrorCode.INTERNAL_ERROR, "로그아웃 처리 중 오류가 발생했습니다", 500)
  }
}
