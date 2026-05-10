import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const phoneSchema = z
  .string()
  .regex(/^01[016789]-?\d{3,4}-?\d{4}$/, "올바른 휴대폰 번호 형식이 아닙니다")
  .nullable()

const patchSchema = z.object({ phoneNumber: phoneSchema })

export async function GET() {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { phoneNumber: true },
  })

  if (!dbUser) return ApiErrors.notFound("사용자를 찾을 수 없습니다")

  return apiSuccess({ phoneNumber: dbUser.phoneNumber })
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      return ApiErrors.validationError(first.message, [
        { field: first.path.join("."), message: first.message },
      ])
    }

    const normalized = parsed.data.phoneNumber?.replace(/-/g, "") ?? null
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { phoneNumber: normalized },
      select: { phoneNumber: true },
    })

    return apiSuccess(
      { phoneNumber: updated.phoneNumber },
      200,
      "휴대폰 번호가 변경되었습니다"
    )
  } catch (error) {
    console.error("휴대폰 번호 변경 오류:", error)
    return ApiErrors.internalError("휴대폰 번호 변경 중 오류가 발생했습니다")
  }
}
