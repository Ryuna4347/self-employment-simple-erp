import { NextRequest, NextResponse } from "next/server"
import { cleanupExpiredRefreshTokens } from "@/lib/tokens"

// Cron Job Secret Key 검증
// 환경 변수: CRON_SECRET
function validateCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET

  // CRON_SECRET이 설정되지 않은 경우 보안 경고
  if (!cronSecret) {
    console.warn("[CRON] CRON_SECRET 환경 변수가 설정되지 않았습니다")
    return false
  }

  // Authorization 헤더에서 Bearer 토큰 추출
  const authHeader = request.headers.get("authorization")
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7)
    return token === cronSecret
  }

  // Vercel Cron은 x-vercel-cron-secret 헤더 사용 (선택적)
  // 또는 CRON_SECRET을 Authorization 헤더로 직접 전달
  const vercelCronSecret = request.headers.get("x-vercel-cron-secret")
  if (vercelCronSecret) {
    return vercelCronSecret === cronSecret
  }

  return false
}

// GET: 만료된 Refresh Token 정리
// Vercel Cron, GitHub Actions 등에서 호출
export async function GET(request: NextRequest) {
  try {
    // 보안: Secret Key 검증
    if (!validateCronSecret(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      )
    }

    // 만료된 토큰 정리 실행
    const result = await cleanupExpiredRefreshTokens()

    console.log(
      `[CRON] Refresh Token 정리 완료: ${result.deletedCount}개 삭제 (${result.executedAt.toISOString()})`
    )

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        executedAt: result.executedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error("[CRON] Refresh Token 정리 오류:", error)
    return NextResponse.json(
      { success: false, message: "Token cleanup failed" },
      { status: 500 }
    )
  }
}

// POST: GET과 동일한 기능 (유연성을 위해 지원)
export async function POST(request: NextRequest) {
  return GET(request)
}
