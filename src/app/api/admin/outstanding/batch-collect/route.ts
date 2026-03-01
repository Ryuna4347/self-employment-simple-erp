import { NextRequest } from "next/server"
import { z } from "zod"
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

    const result = await prisma.workRecord.updateMany({
      where: { id: { in: ids } },
      data: { collectionStatus },
    })

    return apiSuccess({ updatedCount: result.count })
  } catch (error) {
    console.error("일괄 수금 처리 오류:", error)
    return ApiErrors.internalError("일괄 수금 처리 중 오류가 발생했습니다")
  }
}
