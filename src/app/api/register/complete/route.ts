import { NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { decodeInviteCode } from "@/lib/invite"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { passwordSchema } from "@/lib/validations"

const completeSchema = z.object({
  code: z.string().min(1, "초대 코드가 필요합니다"),
  loginId: z.string().min(4, "아이디는 4자리 이상 입력해야합니다"),
  password: passwordSchema,
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = completeSchema.safeParse(body)
    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { code, loginId, password } = parseResult.data

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

    // 이미 등록된 사용자인지 확인
    if (user.password !== null) {
      return ApiErrors.alreadyExists("이미 등록된 사용자입니다")
    }

    // loginId 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { loginId },
    })

    if (existingUser) {
      return ApiErrors.alreadyExists("이미 사용 중인 아이디입니다")
    }

    // 비밀번호 해시
    const hashedPassword = await bcrypt.hash(password, 10)

    // 사용자 정보 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginId,
        password: hashedPassword,
        inviteCode: null, // 초대 코드 제거 (등록 완료)
      },
    })

    return apiSuccess(null, 200, "회원가입이 완료되었습니다")
  } catch (error) {
    console.error("회원가입 완료 오류:", error)
    return ApiErrors.internalError("회원가입 처리 중 오류가 발생했습니다")
  }
}
