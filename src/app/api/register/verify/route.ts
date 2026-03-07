import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { decodeInviteCode } from "@/lib/invite"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const verifySchema = z.object({
  code: z.string().min(1, "초대 코드가 필요합니다"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = verifySchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { code } = parseResult.data

    // 초대 코드 디코딩
    const inviteData = decodeInviteCode(code)
    if (!inviteData) {
      return ApiErrors.validationError("유효하지 않은 초대 코드입니다")
    }

    const { name, inviteCode } = inviteData

    // DB에서 사용자 조회 (inviteCode + name으로)
    const user = await prisma.user.findFirst({
      where: {
        inviteCode,
        name,
        isDeleted: false,
      },
    })

    if (!user) {
      return ApiErrors.notFound("초대 정보를 찾을 수 없습니다")
    }

    // 이미 등록된 사용자인지 확인 (password가 있으면 이미 등록됨)
    if (user.password !== null) {
      return ApiErrors.alreadyExists("이미 등록된 사용자입니다")
    }

    return apiSuccess({
      name: user.name,
      userId: user.id,
    })
  } catch (error) {
    console.error("초대 코드 검증 오류:", error)
    return ApiErrors.internalError("초대 코드 검증 중 오류가 발생했습니다")
  }
}
