import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { generateInviteCode, createInviteUrl } from "@/lib/invite"
import { z } from "zod"

const inviteSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").trim(),
})

export async function POST(request: Request) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parsed = inviteSchema.safeParse(body)

    if (!parsed.success) {
      return ApiErrors.validationError(
        "입력값이 올바르지 않습니다",
        parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        }))
      )
    }

    const { name } = parsed.data

    // 초대 코드 생성
    const inviteCode = generateInviteCode()

    // 사용자 생성 (password는 null, 초대 상태)
    const user = await prisma.user.create({
      data: {
        loginId: `pending_${inviteCode}`,
        name,
        inviteCode,
        password: null,
        role: "USER",
      },
    })

    // 초대 URL 생성
    const baseUrl = process.env.AUTH_URL || "http://localhost:3000"
    const inviteUrl = createInviteUrl(baseUrl, user.name, inviteCode)

    return apiSuccess({
      userId: user.id,
      name: user.name,
      inviteCode,
      inviteUrl,
    })
  } catch (error) {
    console.error("초대 생성 오류:", error)
    return ApiErrors.internalError("초대 생성 중 오류가 발생했습니다")
  }
}
