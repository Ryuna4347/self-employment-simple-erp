import { NextResponse } from "next/server"

/**
 * API 에러 코드 정의
 * 일관된 에러 코드 사용으로 프론트엔드에서 에러 처리 용이
 */
export const ErrorCode = {
  // 인증 관련 (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // 권한 관련 (403)
  FORBIDDEN: "FORBIDDEN",
  ADMIN_REQUIRED: "ADMIN_REQUIRED",

  // 요청 오류 (400)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  INVALID_INVITE_CODE: "INVALID_INVITE_CODE",

  // 리소스 관련 (404, 409)
  NOT_FOUND: "NOT_FOUND",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",

  // 서버 오류 (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * 표준 에러 응답 인터페이스
 */
interface ApiErrorResponse {
  error: {
    code: ErrorCodeType
    message: string
    details?: Array<{ field: string; message: string }>
  }
}

/**
 * 표준 성공 응답 인터페이스
 */
interface ApiSuccessResponse<T = unknown> {
  data: T
  message?: string
}

/**
 * 표준 에러 응답 생성 헬퍼
 */
export function apiError(
  code: ErrorCodeType,
  message: string,
  status: number,
  details?: Array<{ field: string; message: string }>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  )
}

/**
 * 표준 성공 응답 생성 헬퍼
 */
export function apiSuccess<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      data,
      ...(message && { message }),
    },
    { status }
  )
}

/**
 * 자주 사용하는 에러 응답 단축 함수
 */
export const ApiErrors = {
  unauthorized: (message = "인증이 필요합니다") =>
    apiError(ErrorCode.UNAUTHORIZED, message, 401),

  invalidCredentials: (message = "아이디 또는 비밀번호가 올바르지 않습니다") =>
    apiError(ErrorCode.INVALID_CREDENTIALS, message, 401),

  forbidden: (message = "접근 권한이 없습니다") =>
    apiError(ErrorCode.FORBIDDEN, message, 403),

  adminRequired: (message = "관리자 권한이 필요합니다") =>
    apiError(ErrorCode.ADMIN_REQUIRED, message, 403),

  notFound: (message = "리소스를 찾을 수 없습니다") =>
    apiError(ErrorCode.NOT_FOUND, message, 404),

  validationError: (
    message: string,
    details?: Array<{ field: string; message: string }>
  ) => apiError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  alreadyExists: (message = "이미 존재합니다") =>
    apiError(ErrorCode.ALREADY_EXISTS, message, 409),

  internalError: (message = "서버 오류가 발생했습니다") =>
    apiError(ErrorCode.INTERNAL_ERROR, message, 500),
}
