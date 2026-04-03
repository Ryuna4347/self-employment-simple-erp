import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const recurringCostSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").trim(),
  amount: z.coerce.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  frequency: z.enum(["WEEKLY", "MONTHLY"], "주기를 선택해주세요"),
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
    const parseResult = recurringCostSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const existing = await prisma.recurringCost.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("고정비용을 찾을 수 없습니다")
    }

    const { name, amount, frequency } = parseResult.data

    const updated = await prisma.recurringCost.update({
      where: { id },
      data: { name, amount, frequency },
    })

    return apiSuccess(updated)
  } catch (error) {
    console.error("고정비용 수정 오류:", error)
    return ApiErrors.internalError("고정비용 수정 중 오류가 발생했습니다")
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

    const existing = await prisma.recurringCost.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("고정비용을 찾을 수 없습니다")
    }

    await prisma.recurringCost.delete({ where: { id } })

    return apiSuccess({ id })
  } catch (error) {
    console.error("고정비용 삭제 오류:", error)
    return ApiErrors.internalError("고정비용 삭제 중 오류가 발생했습니다")
  }
}
