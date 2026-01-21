import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInviteCode, createInviteUrl } from "@/lib/invite"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json(
        { success: false, message: "사용자명을 입력해주세요" },
        { status: 400 }
      )
    }

    // 초대 코드 생성
    const inviteCode = generateInviteCode()

    // 사용자 생성 (password는 null, 초대 상태)
    const user = await prisma.user.create({
      data: {
        loginId: `pending_${inviteCode}`, // 임시 loginId (나중에 사용자가 변경)
        name: name.trim(),
        inviteCode,
        password: null, // 초대 상태
        role: "USER",
      },
    })

    // 초대 URL 생성
    const baseUrl = process.env.AUTH_URL || "http://localhost:3000"
    const inviteUrl = createInviteUrl(baseUrl, user.name, inviteCode)

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        name: user.name,
        inviteCode,
        inviteUrl,
      },
    })
  } catch (error) {
    console.error("초대 생성 오류:", error)
    return NextResponse.json(
      { success: false, message: "초대 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
