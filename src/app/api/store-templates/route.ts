import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"

// 템플릿 생성/수정 스키마
const createTemplateSchema = z.object({
  name: z.string().min(1, "템플릿 이름을 입력해주세요"),
  description: z.string().optional(),
  members: z
    .array(
      z.object({
        storeId: z.string().min(1, "매장 ID가 필요합니다"),
        order: z.number().int().min(0, "순서는 0 이상이어야 합니다"),
      })
    )
    .min(1, "최소 1개 이상의 매장을 선택해주세요"),
})

/**
 * GET /api/store-templates
 * 본인 템플릿 목록 조회
 */
export async function GET() {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const templates = await prisma.storeTemplate.findMany({
      where: { userId: user.id },
      include: {
        members: {
          orderBy: { order: "asc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // memberCount 추가
    const templatesWithCount = templates.map((template) => ({
      ...template,
      memberCount: template.members.length,
    }))

    return NextResponse.json({ success: true, data: templatesWithCount })
  } catch (error) {
    console.error("템플릿 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/store-templates
 * 템플릿 생성
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = createTemplateSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description, members } = parseResult.data

    // 트랜잭션으로 템플릿과 멤버 함께 생성
    const template = await prisma.$transaction(async (tx) => {
      const newTemplate = await tx.storeTemplate.create({
        data: {
          name,
          description,
          userId: user.id,
        },
      })

      // 멤버 생성
      await tx.storeTemplateMember.createMany({
        data: members.map((member) => ({
          templateId: newTemplate.id,
          storeId: member.storeId,
          order: member.order,
        })),
      })

      // 멤버 포함하여 반환
      return tx.storeTemplate.findUnique({
        where: { id: newTemplate.id },
        include: {
          members: {
            orderBy: { order: "asc" },
            include: {
              store: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
        },
      })
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          ...template,
          memberCount: template?.members.length ?? 0,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("템플릿 생성 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 생성 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
