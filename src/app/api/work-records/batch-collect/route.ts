import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { consolidateAndCollect } from "@/lib/collection-utils"
import { z } from "zod"

const batchCollectSchema = z.object({
  workRecordIds: z.array(z.string()).min(1, "수금할 기록을 선택해주세요"),
})

// 어드민 일괄 수금 처리 (이월 수금 통합)
export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const body = await request.json()
  const parsed = batchCollectSchema.safeParse(body)
  if (!parsed.success) {
    return ApiErrors.validationError("잘못된 요청입니다")
  }

  const { workRecordIds } = parsed.data

  // 대상 레코드 검증
  const records = await prisma.workRecord.findMany({
    where: { id: { in: workRecordIds } },
    select: { id: true, storeId: true, collectionStatus: true },
  })

  if (records.length !== workRecordIds.length) {
    return ApiErrors.notFound("일부 근무 기록을 찾을 수 없습니다")
  }

  // 모든 레코드가 UNCOLLECTED인지 확인
  const nonUncollected = records.filter((r) => r.collectionStatus !== "UNCOLLECTED")
  if (nonUncollected.length > 0) {
    return ApiErrors.validationError("미수 상태인 기록만 수금 처리할 수 있습니다")
  }

  const now = new Date()
  const autoCloseNote = "어드민 직접 수금 처리로 자동 종결"

  const result = await prisma.$transaction(async (tx) => {
    // 1. 처리 대상 workRecordIds가 속한 PENDING 상태의 CollectionRequest 조회
    const pendingRequests = await tx.collectionRequest.findMany({
      where: {
        status: "PENDING",
        items: { some: { workRecordId: { in: workRecordIds } } },
      },
      select: { id: true, note: true },
    })

    // 2. 이월 수금 통합 처리 (기존 로직)
    const consolidateResult = await consolidateAndCollect(tx, workRecordIds, user.id, now)

    // 3. 조회된 PENDING CollectionRequest들을 일괄 APPROVED 처리
    //    note는 기존 값에 append 방식으로 보존 (개별 update로 분기)
    const approvedRequestIds: string[] = []
    for (const req of pendingRequests) {
      const mergedNote = req.note?.trim()
        ? `${req.note}\n${autoCloseNote}`
        : autoCloseNote

      await tx.collectionRequest.update({
        where: { id: req.id },
        data: {
          status: "APPROVED",
          reviewerId: user.id,
          reviewedAt: now,
          note: mergedNote,
        },
      })
      approvedRequestIds.push(req.id)
    }

    return { ...consolidateResult, approvedRequestIds }
  })

  return apiSuccess(result)
}
