import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { dateToKSTMidnight, dateToKSTEndOfDay } from "@/lib/date-utils"
import type { Prisma } from "@/generated/prisma/client"

const bulkDeleteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  userId: z.string().optional(),
  search: z.string().min(1).max(100).optional(),
})

// 근무기록 일괄 삭제
// 현재 화면 필터(date, userId, search)에 매칭되는 근무기록을 일괄 삭제한다.
// 일반 사용자는 본인의 UNCOLLECTED 기록만 삭제할 수 있고, 관리자는 모든 상태를 삭제할 수 있다.
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams

  const parseResult = bulkDeleteSchema.safeParse({
    date: searchParams.get("date"),
    userId: searchParams.get("userId") || undefined,
    search: searchParams.get("search") || undefined,
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { date, userId: requestedUserId, search } = parseResult.data
  const isAdmin = user.role === "ADMIN"

  // 권한 체크 (GET /api/work-records 와 동일)
  if (requestedUserId && requestedUserId !== user.id && requestedUserId !== "all" && !isAdmin) {
    return ApiErrors.forbidden("다른 사용자의 기록을 삭제할 권한이 없습니다")
  }
  if (requestedUserId === "all" && !isAdmin) {
    return ApiErrors.forbidden("전체 기록을 삭제할 권한이 없습니다")
  }

  let userIdFilter: string | undefined
  if (!requestedUserId) {
    userIdFilter = user.id
  } else if (requestedUserId === "all") {
    userIdFilter = undefined
  } else {
    userIdFilter = requestedUserId
  }

  const dateStart = dateToKSTMidnight(date)
  const dateEnd = dateToKSTEndOfDay(date)

  // 매칭 필터 (현재 화면과 동일)
  const matchWhere: Prisma.WorkRecordWhereInput = {
    date: { gte: dateStart, lte: dateEnd },
    ...(userIdFilter && { userId: userIdFilter }),
    ...(search ? { storeNameSnapshot: { contains: search, mode: "insensitive" } } : {}),
  }

  // 일반 사용자는 UNCOLLECTED 만 삭제 가능 (단건 DELETE 와 동일한 권한 모델)
  const deleteWhere: Prisma.WorkRecordWhereInput = isAdmin
    ? matchWhere
    : { ...matchWhere, collectionStatus: "UNCOLLECTED" }

  const [matchCount, result] = await prisma.$transaction([
    prisma.workRecord.count({ where: matchWhere }),
    prisma.workRecord.deleteMany({ where: deleteWhere }),
  ])

  return apiSuccess({
    deleted: result.count,
    skipped: matchCount - result.count,
  })
}
