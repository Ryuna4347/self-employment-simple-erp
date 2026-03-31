import { NextResponse } from "next/server"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { signAccessToken, getAccessTokenCookieOptions, getRefreshTokenCookieOptions } from "@/lib/jwt"
import { generateRefreshToken, createRefreshToken } from "@/lib/token-service"
import { apiError, ErrorCode } from "@/lib/api-response"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { loginId, password, rememberMe = false } = body

    if (!loginId || !password) {
      return apiError(ErrorCode.VALIDATION_ERROR, "아이디와 비밀번호를 입력해주세요", 400)
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { loginId },
    })

    // 사용자 없음 또는 비밀번호 미설정(초대 대기 상태)
    if (!user?.password) {
      return apiError(ErrorCode.INVALID_CREDENTIALS, "아이디 또는 비밀번호가 올바르지 않습니다", 401)
    }

    // 삭제된 사용자 체크
    if (user.isDeleted) {
      return apiError(ErrorCode.INVALID_CREDENTIALS, "아이디 또는 비밀번호가 올바르지 않습니다", 401)
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return apiError(ErrorCode.INVALID_CREDENTIALS, "아이디 또는 비밀번호가 올바르지 않습니다", 401)
    }

    // accessToken 생성
    const authUser = {
      id: user.id,
      name: user.name,
      loginId: user.loginId,
      role: user.role,
    }
    const { token: accessToken, expiresAt } = await signAccessToken(authUser)

    // refreshToken 생성 + DB 저장
    const refreshToken = generateRefreshToken()
    await createRefreshToken(user.id, refreshToken, rememberMe)

    // 쿠키 설정
    const response = NextResponse.json({
      data: {
        user: authUser,
        expiresAt,
      },
    })

    const accessOpts = getAccessTokenCookieOptions()
    response.cookies.set(accessOpts.name, accessToken, accessOpts)

    const refreshOpts = getRefreshTokenCookieOptions()
    response.cookies.set(refreshOpts.name, refreshToken, refreshOpts)

    return response
  } catch (error) {
    console.error("[POST /api/auth/login] 에러:", error)
    return apiError(ErrorCode.INTERNAL_ERROR, "로그인 처리 중 오류가 발생했습니다", 500)
  }
}
