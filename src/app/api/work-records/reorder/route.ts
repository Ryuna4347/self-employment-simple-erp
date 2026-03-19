import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { z } from "zod"

const reorderSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  records: z
    .array(
      z.object({
        id: z.string(),
        sortOrder: z.number().int().min(0),
      })
    )
    .min(1, "변경할 기록이 없습니다"),
})

// 근무기록 순서 일괄 변경
export async function PATCH(request: Request) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const body = await request.json()
  const parsed = reorderSchema.safeParse(body)
  if (!parsed.success) {
    return ApiErrors.validationError("잘못된 요청입니다")
  }

  const { date, records } = parsed.data
  const recordIds = records.map((r) => r.id)

  // 대상 레코드 검증: 본인 소유 + 해당 날짜
  const existingRecords = await prisma.workRecord.findMany({
    where: { id: { in: recordIds } },
    select: { id: true, userId: true, date: true },
  })

  if (existingRecords.length !== recordIds.length) {
    return ApiErrors.notFound("일부 근무 기록을 찾을 수 없습니다")
  }

  // 모든 레코드가 본인 소유이고 해당 날짜인지 확인
  const targetDate = new Date(date + "T00:00:00.000Z")
  const invalid = existingRecords.find(
    (r) =>
      r.userId !== user.id ||
      r.date.toISOString().slice(0, 10) !== targetDate.toISOString().slice(0, 10)
  )

  if (invalid) {
    return ApiErrors.forbidden("본인의 해당 날짜 근무 기록만 순서를 변경할 수 있습니다")
  }

  // 트랜잭션으로 일괄 업데이트
  await prisma.$transaction(
    records.map((r) =>
      prisma.workRecord.update({
        where: { id: r.id },
        data: { sortOrder: r.sortOrder },
      })
    )
  )

  return apiSuccess({ updated: records.length })
}
