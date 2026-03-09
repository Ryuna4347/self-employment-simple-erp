import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { format } from "date-fns"
import { dateToKSTMidnight, startOfMonthKST, endOfMonthKST, toKSTLocal } from "@/lib/date-utils"

// GET 쿼리 파라미터 스키마
const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

// POST/PUT 바디 스키마
const costSchema = z.object({
  date: z.string().min(1, "날짜를 입력해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  amount: z.coerce.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  description: z.string().trim().optional(),
})

export type CostFormData = z.infer<typeof costSchema>

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = querySchema.safeParse({
      year: searchParams.get("year"),
      month: searchParams.get("month"),
    })

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { year, month } = parseResult.data
    const dateStart = startOfMonthKST(year, month)
    const dateEnd = endOfMonthKST(year, month)

    const [records, aggregate] = await Promise.all([
      prisma.expense.findMany({
        where: { date: { gte: dateStart, lte: dateEnd } },
        include: { user: { select: { name: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.expense.aggregate({
        _sum: { amount: true },
        _count: true,
        where: { date: { gte: dateStart, lte: dateEnd } },
      }),
    ])

    const formattedRecords = records.map((r) => ({
      id: r.id,
      date: format(toKSTLocal(r.date), "yyyy-MM-dd"),
      title: r.title,
      amount: r.amount,
      description: r.description,
      userName: r.user.name,
    }))

    return apiSuccess({
      records: formattedRecords,
      summary: {
        totalCosts: aggregate._sum.amount ?? 0,
        count: aggregate._count,
      },
    })
  } catch (error) {
    console.error("비용 목록 조회 오류:", error)
    return ApiErrors.internalError("비용 목록 조회 중 오류가 발생했습니다")
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = costSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { date, title, amount, description } = parseResult.data

    const expense = await prisma.expense.create({
      data: {
        date: dateToKSTMidnight(date),
        title,
        amount,
        description: description || null,
        userId: authResult.user.id,
      },
    })

    return apiSuccess(expense, 201)
  } catch (error) {
    console.error("비용 생성 오류:", error)
    return ApiErrors.internalError("비용 생성 중 오류가 발생했습니다")
  }
}
