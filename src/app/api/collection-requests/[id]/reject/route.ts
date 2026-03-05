import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

interface RouteContext {
  params: Promise<{ id: string }>
}

// 수금 확인 요청 거부
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await context.params

  const collectionRequest = await prisma.collectionRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  })

  if (!collectionRequest) {
    return ApiErrors.notFound("수금 확인 요청을 찾을 수 없습니다")
  }

  if (collectionRequest.status !== "PENDING") {
    return ApiErrors.validationError("이미 처리된 요청입니다")
  }

  await prisma.collectionRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewerId: user.id,
      reviewedAt: new Date(),
    },
  })

  return apiSuccess({ rejected: true })
}
