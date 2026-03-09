import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { dateToKSTMidnight } from "@/lib/date-utils"

const costSchema = z.object({
  date: z.string().min(1, "날짜를 입력해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  amount: z.coerce.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  description: z.string().trim().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const parseResult = costSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("비용 기록을 찾을 수 없습니다")
    }

    const { date, title, amount, description } = parseResult.data

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        date: dateToKSTMidnight(date),
        title,
        amount,
        description: description || null,
      },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error("비용 수정 오류:", error)
    return ApiErrors.internalError("비용 수정 중 오류가 발생했습니다")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const existing = await prisma.expense.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("비용 기록을 찾을 수 없습니다")
    }

    await prisma.expense.delete({ where: { id } })

    return apiSuccess({ id })
  } catch (error) {
    console.error("비용 삭제 오류:", error)
    return ApiErrors.internalError("비용 삭제 중 오류가 발생했습니다")
  }
}
