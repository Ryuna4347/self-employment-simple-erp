import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 최신 공지 1건 조회 (만료되지 않은 것)
export async function GET() {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const now = new Date()

    const notice = await prisma.notice.findFirst({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        author: { select: { name: true } },
      },
    })

    return apiSuccess(notice)
  } catch (error) {
    console.error("최신 공지 조회 오류:", error)
    return ApiErrors.internalError("공지 조회 중 오류가 발생했습니다")
  }
}
