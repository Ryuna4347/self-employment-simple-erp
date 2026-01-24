import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { decodeInviteCode } from "@/lib/invite"

const verifySchema = z.object({
  code: z.string().min(1, "초대 코드가 필요합니다"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = verifySchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { code } = parseResult.data

    // 초대 코드 디코딩
    const inviteData = decodeInviteCode(code)
    if (!inviteData) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 초대 코드입니다" },
        { status: 400 }
      )
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
      return NextResponse.json(
        { success: false, message: "초대 정보를 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    // 이미 등록된 사용자인지 확인 (password가 있으면 이미 등록됨)
    if (user.password !== null) {
      return NextResponse.json(
        { success: false, message: "이미 등록된 사용자입니다" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        name: user.name,
        userId: user.id,
      },
    })
  } catch (error) {
    console.error("초대 코드 검증 오류:", error)
    return NextResponse.json(
      { success: false, message: "초대 코드 검증 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
