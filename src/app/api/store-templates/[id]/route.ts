import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { ApiErrors } from "@/lib/api-response"

// 템플릿 수정 스키마
const updateTemplateSchema = z.object({
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

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/store-templates/[id]
 * 템플릿 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    const template = await prisma.storeTemplate.findUnique({
      where: { id },
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

    if (!template) {
      return ApiErrors.notFound("템플릿을 찾을 수 없습니다")
    }

    // 본인 템플릿만 조회 가능
    if (template.userId !== user.id) {
      return ApiErrors.forbidden("다른 사용자의 템플릿입니다")
    }

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        memberCount: template.members.length,
      },
    })
  } catch (error) {
    console.error("템플릿 상세 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/store-templates/[id]
 * 템플릿 수정 (owner만)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    // 기존 템플릿 확인
    const existingTemplate = await prisma.storeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return ApiErrors.notFound("템플릿을 찾을 수 없습니다")
    }

    if (existingTemplate.userId !== user.id) {
      return ApiErrors.forbidden("다른 사용자의 템플릿입니다")
    }

    const body = await request.json()

    // 입력 검증
    const parseResult = updateTemplateSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, description, members } = parseResult.data

    // 트랜잭션으로 템플릿과 멤버 함께 수정
    const template = await prisma.$transaction(async (tx) => {
      // 템플릿 정보 수정
      await tx.storeTemplate.update({
        where: { id },
        data: { name, description },
      })

      // 기존 멤버 삭제 후 새로 생성
      await tx.storeTemplateMember.deleteMany({
        where: { templateId: id },
      })

      await tx.storeTemplateMember.createMany({
        data: members.map((member) => ({
          templateId: id,
          storeId: member.storeId,
          order: member.order,
        })),
      })

      // 멤버 포함하여 반환
      return tx.storeTemplate.findUnique({
        where: { id },
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

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        memberCount: template?.members.length ?? 0,
      },
    })
  } catch (error) {
    console.error("템플릿 수정 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/store-templates/[id]
 * 템플릿 삭제 (owner만)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    // 기존 템플릿 확인
    const existingTemplate = await prisma.storeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return ApiErrors.notFound("템플릿을 찾을 수 없습니다")
    }

    if (existingTemplate.userId !== user.id) {
      return ApiErrors.forbidden("다른 사용자의 템플릿입니다")
    }

    // 삭제 (cascade로 멤버도 함께 삭제됨)
    await prisma.storeTemplate.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "템플릿이 삭제되었습니다" })
  } catch (error) {
    console.error("템플릿 삭제 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
