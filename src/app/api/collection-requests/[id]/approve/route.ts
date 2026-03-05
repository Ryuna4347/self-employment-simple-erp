import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess } from "@/lib/api-response"
import { consolidateAndCollect } from "@/lib/collection-utils"

interface RouteContext {
  params: Promise<{ id: string }>
}

// 수금 확인 요청 승인
export async function POST(request: Request, context: RouteContext) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await context.params

  const result = await prisma.$transaction(async (tx) => {
    // 1. 요청 조회
    const collectionRequest = await tx.collectionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workRecord: true,
          },
        },
      },
    })

    if (!collectionRequest) {
      throw new Error("NOT_FOUND")
    }
    if (collectionRequest.status !== "PENDING") {
      throw new Error("ALREADY_PROCESSED")
    }

    // 2. UNCOLLECTED 레코드 ID 추출
    const uncollectedIds = collectionRequest.items
      .filter((item) => item.workRecord.collectionStatus === "UNCOLLECTED")
      .map((item) => item.workRecordId)

    if (uncollectedIds.length === 0) {
      throw new Error("NO_UNCOLLECTED")
    }

    // 3. 이월 수금 통합 처리
    const collectResult = await consolidateAndCollect(
      tx,
      uncollectedIds,
      collectionRequest.requesterId, // 요청자
      collectionRequest.createdAt, // 요청 시점
    )

    // 4. CollectionRequest 승인 처리
    await tx.collectionRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewerId: user.id,
        reviewedAt: new Date(),
      },
    })

    return collectResult
  })

  return apiSuccess(result)
}
