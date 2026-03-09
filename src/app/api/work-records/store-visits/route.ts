import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { subMonths } from "date-fns"
import { dateToKSTMidnight, toKSTDateString } from "@/lib/date-utils"

const querySchema = z.object({
  storeId: z.string().min(1, "매장 ID가 필요합니다"),
})

/**
 * 매장 방문 이력 조회 (최근 6개월, 휴업&폐업 제외)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const parseResult = querySchema.safeParse({
    storeId: searchParams.get("storeId"),
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { storeId } = parseResult.data
  // KST 기준 오늘에서 6개월 전
  const todayUTC = new Date(toKSTDateString() + "T00:00:00.000Z")
  const sixMonthsAgo = dateToKSTMidnight(subMonths(todayUTC, 6).toISOString().slice(0, 10))

  const visits = await prisma.workRecord.findMany({
    where: {
      storeId,
      date: { gte: sixMonthsAgo },
      collectionStatus: { not: "CLOSED" },
    },
    select: {
      date: true,
      collectionStatus: true,
    },
    orderBy: { date: "asc" },
  })

  return apiSuccess(visits)
}
