import { prisma } from "@/lib/prisma"
import { requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { dateToKSTMidnight, dateToKSTEndOfDay } from "@/lib/date-utils"
import { Prisma } from "@/generated/prisma/client"
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
  const authResult = await requireWriteAccess()
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

  // 모든 레코드가 본인 소유이고 해당 날짜인지 확인 (KST 기준 범위 비교)
  const dateStart = dateToKSTMidnight(date)
  const dateEnd = dateToKSTEndOfDay(date)
  const invalid = existingRecords.find(
    (r) =>
      r.userId !== user.id ||
      r.date < dateStart || r.date > dateEnd
  )

  if (invalid) {
    return ApiErrors.forbidden("본인의 해당 날짜 근무 기록만 순서를 변경할 수 있습니다")
  }

  // 한 번의 UPDATE로 일괄 변경 (기존: 레코드 수만큼 UPDATE를 순차 실행)
  // updatedAt은 Prisma @updatedAt이 채우던 값이므로 raw 쿼리에서 직접 갱신한다
  const now = new Date()
  const values = Prisma.join(
    records.map((r) => Prisma.sql`(${r.id}::text, ${r.sortOrder}::integer)`)
  )
  await prisma.$transaction(async (tx) => {
    const updatedCount = await tx.$executeRaw`
      UPDATE "WorkRecord" AS wr
      SET "sortOrder" = v."sortOrder", "updatedAt" = ${now}
      FROM (VALUES ${values}) AS v(id, "sortOrder")
      WHERE wr.id = v.id
    `
    // 검증 이후 삭제된 기록이 있으면 기존처럼 전체를 되돌린다 (기존: update가 P2025로 실패해 롤백)
    if (updatedCount !== records.length) {
      throw new Error("순서 변경 대상 근무기록 일부를 찾을 수 없습니다")
    }
  })

  return apiSuccess({ updated: records.length })
}
