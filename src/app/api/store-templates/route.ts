import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 코스 생성/수정 스키마
const createTemplateSchema = z.object({
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
})

// 코스 목록 조회 쿼리 스키마
const querySchema = z.object({
  userId: z.string().optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

/**
 * GET /api/store-templates
 * 코스 목록 조회
 *
 * page 파라미터가 있으면 페이지네이션 모드, 없으면 전체 조회 (모달 호환)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams

  const parseResult = querySchema.safeParse({
    userId: searchParams.get("userId") || undefined,
    search: searchParams.get("search") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { userId: requestedUserId, search, page, limit } = parseResult.data

  // userId 필터 결정
  let userIdFilter: string | undefined
  if (!requestedUserId) {
    userIdFilter = user.id
  } else if (requestedUserId === "all") {
    userIdFilter = undefined
  } else {
    userIdFilter = requestedUserId
  }

  const includeClause = {
    members: {
      where: { store: { isDeleted: false } },
      orderBy: { order: "asc" as const },
      include: {
        store: {
          select: {
            id: true,
            name: true,
            address: true,
            visitCycleWeeks: true,
            firstVisitDate: true,
          },
        },
      },
    },
  }

  try {
    // 페이지네이션 모드
    if (page) {
      const where = {
        ...(userIdFilter && { userId: userIdFilter }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }),
      }

      const [totalCount, templates] = await Promise.all([
        prisma.storeTemplate.count({ where }),
        prisma.storeTemplate.findMany({
          where,
          include: includeClause,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ])

      const templatesWithCount = templates.map((template) => ({
        ...template,
        memberCount: template.members.length,
      }))

      const totalPages = Math.ceil(totalCount / limit)

      return apiSuccess({
        templates: templatesWithCount,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      })
    }

    // 전체 조회 모드 (기존 호환 - 모달용)
    const templates = await prisma.storeTemplate.findMany({
      where: {
        ...(userIdFilter && { userId: userIdFilter }),
      },
      include: includeClause,
      orderBy: { createdAt: "desc" },
    })

    const templatesWithCount = templates.map((template) => ({
      ...template,
      memberCount: template.members.length,
    }))

    return apiSuccess(templatesWithCount)
  } catch (error) {
    console.error("코스 목록 조회 오류:", error)
    return ApiErrors.internalError("코스 목록 조회 중 오류가 발생했습니다")
  }
}

/**
 * POST /api/store-templates
 * 코스 생성
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
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { name, description, members } = parseResult.data

    // 트랜잭션으로 코스과 멤버 함께 생성
    const template = await prisma.$transaction(async (tx) => {
      const newTemplate = await tx.storeTemplate.create({
        data: {
          name,
          description,
          userId: user.id,
        },
      })

      // 멤버 생성
      if (members.length > 0) {
        await tx.storeTemplateMember.createMany({
          data: members.map((member) => ({
            templateId: newTemplate.id,
            storeId: member.storeId,
            order: member.order,
          })),
        })
      }

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

    return apiSuccess(
      {
        ...template,
        memberCount: template?.members.length ?? 0,
      },
      201
    )
  } catch (error) {
    console.error("코스 생성 오류:", error)
    return ApiErrors.internalError("코스 생성 중 오류가 발생했습니다")
  }
}
