import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess } from "@/lib/api-response"

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
    // 1. 요청 조회 (포함된 WorkRecord + RecordItem)
    const collectionRequest = await tx.collectionRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            workRecord: {
              include: { items: true },
            },
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

    // 2. 날짜 ASC 정렬
    const sortedRecords = collectionRequest.items
      .map((item) => item.workRecord)
      .filter((wr) => wr.collectionStatus === "UNCOLLECTED") // 이미 수금된 건 제외
      .sort((a, b) => a.date.getTime() - b.date.getTime())

    if (sortedRecords.length === 0) {
      throw new Error("NO_UNCOLLECTED")
    }

    const lastRecord = sortedRecords[sortedRecords.length - 1]

    // 3. 마지막 날짜 제외 모든 레코드의 RecordItem.amount → 0
    const recordsToZero = sortedRecords.slice(0, -1)
    let accumulatedAmount = 0

    for (const record of recordsToZero) {
      const recordTotal = record.items.reduce((sum, item) => sum + item.amount, 0)
      accumulatedAmount += recordTotal

      await tx.recordItem.updateMany({
        where: { workRecordId: record.id },
        data: { amount: 0 },
      })
    }

    // 4. 마지막 날짜 레코드에 "이월 수금" 항목 추가
    if (accumulatedAmount > 0) {
      await tx.recordItem.create({
        data: {
          workRecordId: lastRecord.id,
          name: "이월 수금",
          amount: accumulatedAmount,
          quantity: 1,
        },
      })
    }

    // 5. 모든 레코드 COLLECTED 처리 (collectedAt = 요청 시점, collectedByUserId = 요청자)
    const allRecordIds = sortedRecords.map((r) => r.id)
    await tx.workRecord.updateMany({
      where: { id: { in: allRecordIds } },
      data: {
        collectionStatus: "COLLECTED",
        collectedAt: collectionRequest.createdAt, // 요청 시점
        collectedByUserId: collectionRequest.requesterId, // 요청자
      },
    })

    // 6. CollectionRequest 승인 처리
    await tx.collectionRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewerId: user.id,
        reviewedAt: new Date(),
      },
    })

    return {
      updatedCount: allRecordIds.length,
      accumulatedAmount,
    }
  })

  return apiSuccess(result)
}
