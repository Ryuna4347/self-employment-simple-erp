import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { dateToKSTMidnight } from "@/lib/date-utils"

// 허용 비용 타입
const ALLOWED_TITLES = ["주유비", "차량수리비"] as const
type AllowedTitle = (typeof ALLOWED_TITLES)[number]

// GET 쿼리 파라미터 스키마
const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  title: z.enum(ALLOWED_TITLES, { error: "허용되지 않는 비용 타입입니다" }),
  userId: z.string().optional(),
})

// POST 바디 스키마
const dailyCostSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  title: z.enum(ALLOWED_TITLES, { error: "허용되지 않는 비용 타입입니다" }),
  amount: z.coerce.number().int().min(0, "금액은 0원 이상이어야 합니다"),
})

// GET: 특정 날짜의 비용 조회
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = querySchema.safeParse({
      date: searchParams.get("date"),
      title: searchParams.get("title"),
      userId: searchParams.get("userId") || undefined,
    })

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { date, title, userId } = parseResult.data
    const kstDate = dateToKSTMidnight(date)

    // 어드민은 다른 유저의 비용 조회 가능, 일반 유저는 자기 것만
    const targetUserId = (authResult.user.role === "ADMIN" && userId)
      ? userId
      : authResult.user.id

    const expense = await prisma.expense.findFirst({
      where: {
        title,
        userId: targetUserId,
        date: kstDate,
      },
    })

    return apiSuccess({ amount: expense?.amount ?? null })
  } catch (error) {
    console.error("비용 조회 오류:", error)
    return ApiErrors.internalError("비용 조회 중 오류가 발생했습니다")
  }
}

// POST: 비용 입력 (동일 날짜 존재 시 덮어쓰기)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = dailyCostSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { date, title, amount } = parseResult.data
    const kstDate = dateToKSTMidnight(date)

    const existing = await prisma.expense.findFirst({
      where: {
        title,
        userId: authResult.user.id,
        date: kstDate,
      },
    })

    // 금액이 0이면 기존 레코드 삭제
    if (amount === 0) {
      if (existing) {
        await prisma.expense.delete({ where: { id: existing.id } })
      }
      return apiSuccess({ amount: null })
    }

    // 기존 레코드 존재 시 덮어쓰기, 없으면 생성
    if (existing) {
      const updated = await prisma.expense.update({
        where: { id: existing.id },
        data: { amount },
      })
      return apiSuccess({ amount: updated.amount })
    }

    const created = await prisma.expense.create({
      data: {
        date: kstDate,
        title,
        amount,
        userId: authResult.user.id,
      },
    })

    return apiSuccess({ amount: created.amount }, 201)
  } catch (error) {
    console.error("비용 저장 오류:", error)
    return ApiErrors.internalError("비용 저장 중 오류가 발생했습니다")
  }
}
