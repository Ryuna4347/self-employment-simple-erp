import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { startOfDay, endOfDay, parseISO } from "date-fns"

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  userId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams

  const parseResult = querySchema.safeParse({
    date: searchParams.get("date"),
    userId: searchParams.get("userId") || undefined,
  })

  if (!parseResult.success) {
    return ApiErrors.validationError(parseResult.error.issues[0].message)
  }

  const { date, userId: requestedUserId } = parseResult.data
  const isAdmin = user.role === "ADMIN"

  // 권한 체크
  if (requestedUserId && requestedUserId !== user.id && requestedUserId !== "all" && !isAdmin) {
    return ApiErrors.forbidden("다른 사용자의 기록을 조회할 권한이 없습니다")
  }
  if (requestedUserId === "all" && !isAdmin) {
    return ApiErrors.forbidden("전체 기록을 조회할 권한이 없습니다")
  }

  const targetDate = parseISO(date)
  const dateStart = startOfDay(targetDate)
  const dateEnd = endOfDay(targetDate)

  let userIdFilter: string | undefined
  if (!requestedUserId) {
    userIdFilter = user.id
  } else if (requestedUserId === "all") {
    userIdFilter = undefined
  } else {
    userIdFilter = requestedUserId
  }

  const workRecords = await prisma.workRecord.findMany({
    where: {
      date: { gte: dateStart, lte: dateEnd },
      ...(userIdFilter && { userId: userIdFilter }),
    },
    include: {
      store: { select: { id: true, name: true, address: true, managerName: true } },
      items: { select: { id: true, name: true, unitPrice: true, quantity: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  return apiSuccess(workRecords)
}
