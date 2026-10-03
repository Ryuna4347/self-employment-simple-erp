import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin, requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 코스 수정 스키마
const updateTemplateSchema = z.object({
  name: z.string().min(1, "코스 이름을 입력해주세요"),
  description: z.string().optional(),
  members: z
    .array(
      z.object({
        storeId: z.string().min(1, "매장 ID가 필요합니다"),
        order: z.number().int().min(0, "순서는 0 이상이어야 합니다"),
      })
    )
    .default([]),
  // 담당자 이전: 현재 담당자와 다른 직원 ID를 보내면 코스를 그 직원에게 이전
  ownerId: z.string().min(1, "이전할 직원 ID가 필요합니다").optional(),
  // 이전 시 코스 내 매장 담당자(기존 코스 담당자 또는 미지정 매장만)도 함께 이전할지 여부
  transferStores: z.boolean().default(false),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/store-templates/[id]
 * 코스 상세 조회
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { id } = await params

  try {
    const template = await prisma.storeTemplate.findUnique({
      where: { id },
      include: {
        members: {
          where: { store: { isDeleted: false } },
          orderBy: { order: "asc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                PaymentType: true,
                managerName: true,
                assignedUserId: true,
              },
            },
          },
        },
      },
    })

    if (!template) {
      return ApiErrors.notFound("코스을 찾을 수 없습니다")
    }

    return apiSuccess({
      ...template,
      memberCount: template.members.length,
    })
  } catch (error) {
    console.error("코스 상세 조회 오류:", error)
    return ApiErrors.internalError("코스 조회 중 오류가 발생했습니다")
  }
}

/**
 * PUT /api/store-templates/[id]
 * 코스 수정
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // 쓰기 권한(USER 이상) 코스 수정 가능
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    // 기존 코스 확인
    const existingTemplate = await prisma.storeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return ApiErrors.notFound("코스을 찾을 수 없습니다")
    }

    // 본인 코스만 수정 가능 (ADMIN은 전체 허용)
    if (user.role !== "ADMIN" && existingTemplate.userId !== user.id) {
      return ApiErrors.forbidden("본인이 만든 코스만 수정할 수 있습니다")
    }

    const body = await request.json()

    // 입력 검증
    const parseResult = updateTemplateSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { name, description, members, ownerId, transferStores } = parseResult.data

    // 현재 담당자와 다른 직원을 지정한 경우만 이전으로 처리 (같으면 무시)
    const newOwnerId = ownerId && ownerId !== existingTemplate.userId ? ownerId : null

    if (newOwnerId) {
      // 이전 대상: 활성 직원(삭제·초대 미완료 제외), 읽기 전용(VIEWER) 제외
      const newOwner = await prisma.user.findFirst({
        where: {
          id: newOwnerId,
          isDeleted: false,
          password: { not: null },
          role: { not: "VIEWER" },
        },
        select: { id: true },
      })

      if (!newOwner) {
        return ApiErrors.validationError("이전할 직원을 찾을 수 없습니다", [
          { field: "ownerId", message: "이전할 직원을 찾을 수 없습니다" },
        ])
      }
    }

    // 트랜잭션으로 코스과 멤버 함께 수정
    let transferredStoreCount = 0
    const template = await prisma.$transaction(async (tx) => {
      // 코스 정보 수정 (이전 시 담당자 변경 포함)
      await tx.storeTemplate.update({
        where: { id },
        data: { name, description, ...(newOwnerId && { userId: newOwnerId }) },
      })

      // 매장 담당자 함께 이전: 기존 코스 담당자 담당이거나 미지정인 활성 매장만 변경
      if (newOwnerId && transferStores && members.length > 0) {
        const result = await tx.store.updateMany({
          where: {
            id: { in: members.map((member) => member.storeId) },
            isDeleted: false,
            OR: [{ assignedUserId: existingTemplate.userId }, { assignedUserId: null }],
          },
          data: { assignedUserId: newOwnerId },
        })
        transferredStoreCount = result.count
      }

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
                  assignedUserId: true,
                },
              },
            },
          },
        },
      })
    })

    return apiSuccess({
      ...template,
      memberCount: template?.members.length ?? 0,
      transferredStoreCount,
    })
  } catch (error) {
    console.error("코스 수정 오류:", error)
    return ApiErrors.internalError("코스 수정 중 오류가 발생했습니다")
  }
}

/**
 * DELETE /api/store-templates/[id]
 * 코스 삭제
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // 관리자만 코스 삭제 가능
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { id } = await params

  try {
    // 기존 코스 확인
    const existingTemplate = await prisma.storeTemplate.findUnique({
      where: { id },
    })

    if (!existingTemplate) {
      return ApiErrors.notFound("코스을 찾을 수 없습니다")
    }

    // 삭제 (cascade로 멤버도 함께 삭제됨)
    await prisma.storeTemplate.delete({
      where: { id },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error("코스 삭제 오류:", error)
    return ApiErrors.internalError("코스 삭제 중 오류가 발생했습니다")
  }
}
