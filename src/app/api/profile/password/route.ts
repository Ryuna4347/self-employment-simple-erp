import { NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { passwordSchema } from "@/lib/validations"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
  newPassword: passwordSchema,
})

export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = changePasswordSchema.safeParse(body)
    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { currentPassword, newPassword } = parseResult.data

    // DB에서 사용자 조회
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    })

    if (!dbUser || !dbUser.password) {
      return ApiErrors.notFound("사용자를 찾을 수 없습니다")
    }

    // 현재 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      dbUser.password,
    )
    if (!isPasswordValid) {
      return ApiErrors.validationError("현재 비밀번호가 올바르지 않습니다")
    }

    // 새 비밀번호 해시 및 저장
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return apiSuccess({ success: true }, 200, "비밀번호가 변경되었습니다")
  } catch (error) {
    console.error("비밀번호 변경 오류:", error)
    return ApiErrors.internalError("비밀번호 변경 중 오류가 발생했습니다")
  }
}
