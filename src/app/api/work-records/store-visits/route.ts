import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { subMonths } from "date-fns"
import { dateToKSTMidnight, toKSTDateString } from "@/lib/date-utils"

const querySchema = z.object({
  storeId: z.string().min(1, "매장 ID가 필요합니다"),
  // 조회 기간 (개월). 미지정 시 6개월
  months: z.coerce
    .number()
    .int("조회 기간은 정수여야 합니다")
    .min(1, "조회 기간은 1개월 이상이어야 합니다")
    .max(12, "조회 기간은 12개월 이하여야 합니다")
    .default(6),
  // 수금 상태 필터. 미지정 시 휴업&폐업(CLOSED)만 제외
  status: z.enum(["UNCOLLECTED", "COLLECTED"]).optional(),
})

/**
 * 매장 방문 이력 조회 (기본: 최근 6개월, 휴업&폐업 제외)
 *
 * - `months`: 조회 기간 1~12개월 (기본 6)
 * - `status`: 지정 시 해당 수금 상태 기록만 조회 (예: 매장 목록의 방문일 모달은 COLLECTED)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const parseResult = querySchema.safeParse({
    storeId: searchParams.get("storeId"),
    months: searchParams.get("months") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { storeId, months, status } = parseResult.data
  // KST 기준 오늘에서 N개월 전
  const todayUTC = new Date(toKSTDateString() + "T00:00:00.000Z")
  const since = dateToKSTMidnight(subMonths(todayUTC, months).toISOString().slice(0, 10))

  const visits = await prisma.workRecord.findMany({
    where: {
      storeId,
      date: { gte: since },
      collectionStatus: status ?? { not: "CLOSED" },
    },
    select: {
      date: true,
      collectionStatus: true,
    },
    orderBy: { date: "asc" },
  })

  return apiSuccess(visits)
}
