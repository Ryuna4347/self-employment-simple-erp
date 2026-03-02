import { NextRequest } from "next/server"
import { z } from "zod"
import { startOfDay } from "date-fns"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const batchCollectSchema = z.object({
  ids: z.array(z.string()).min(1, "최소 1개의 레코드가 필요합니다"),
  collectionStatus: z.enum(["UNCOLLECTED", "COLLECTED", "CLOSED"]),
})

/**
 * 미수금 일괄 수금 처리
 *
 * 여러 근무기록의 수금 상태를 한 번에 변경한다.
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = batchCollectSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { ids, collectionStatus } = parseResult.data

    // 오늘 날짜의 레코드는 수금처리 대상에서 제외
    const today = startOfDay(new Date())

    const result = await prisma.$transaction(async (tx) => {
      const targetRecords = await tx.workRecord.findMany({
        where: {
          id: { in: ids },
          date: { lt: today },
        },
        select: { id: true },
      })

      const targetIds = targetRecords.map((r) => r.id)

      if (targetIds.length === 0) {
        return { updatedCount: 0 }
      }

      const updateResult = await tx.workRecord.updateMany({
        where: { id: { in: targetIds } },
        data: { collectionStatus },
      })

      // 수금 완료 시 품목 금액을 0으로 설정
      if (collectionStatus === "COLLECTED") {
        await tx.recordItem.updateMany({
          where: { workRecordId: { in: targetIds } },
          data: { amount: 0 },
        })
      }

      return { updatedCount: updateResult.count }
    })

    return apiSuccess(result)
  } catch (error) {
    console.error("일괄 수금 처리 오류:", error)
    return ApiErrors.internalError("일괄 수금 처리 중 오류가 발생했습니다")
  }
}
