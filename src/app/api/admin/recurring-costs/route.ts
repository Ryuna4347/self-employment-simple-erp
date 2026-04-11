import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// POST/PUT 바디 스키마
const recurringCostSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").trim(),
  amount: z.coerce.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  frequency: z.enum(["WEEKLY", "MONTHLY"], "주기를 선택해주세요"),
})

export type RecurringCostFormData = z.infer<typeof recurringCostSchema>

export async function GET() {
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  try {
    const records = await prisma.recurringCost.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(records)
  } catch (error) {
    console.error("고정비용 목록 조회 오류:", error)
    return ApiErrors.internalError("고정비용 목록 조회 중 오류가 발생했습니다")
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = recurringCostSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { name, amount, frequency } = parseResult.data

    const created = await prisma.recurringCost.create({
      data: { name, amount, frequency, userId: authResult.user.id },
    })

    return apiSuccess(created, 201)
  } catch (error) {
    console.error("고정비용 생성 오류:", error)
    return ApiErrors.internalError("고정비용 생성 중 오류가 발생했습니다")
  }
}
