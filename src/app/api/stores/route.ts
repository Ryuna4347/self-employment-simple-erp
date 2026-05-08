import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const storeInclude = {
  storeItems: true,
  assignedUser: { select: { id: true, name: true } },
}

const storeItemSchema = z.object({
  name: z.string().min(1, "품목명을 입력해주세요"),
  amount: z.number().int().min(0, "금액은 0 이상이어야 합니다"),
  quantity: z.number().int().min(0, "수량은 0 이상이어야 합니다"),
})

const createStoreSchema = z
  .object({
    name: z.string().min(1, "매장명을 입력해주세요"),
    address: z.string().min(1, "주소를 입력해주세요"),
    managerName: z.string().nullish(),
    PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
    kakaoPlaceId: z.string().nullish(),
    latitude: z.number().nullish(),
    longitude: z.number().nullish(),
    items: z.array(storeItemSchema).optional(),
    templateId: z.string().nullish(),
    assignedUserId: z.string().nullish(),
    receiptType: z.enum(["NONE", "SIMPLE_RECEIPT", "TRANSACTION_STATEMENT"]).optional(),
    note: z.string().nullish(),
  })
  .refine((data) => data.PaymentType !== "ACCOUNT" || !!data.managerName?.trim(), {
    message: "계좌이체 결제 시 입금자를 입력해주세요",
    path: ["managerName"],
  })

const querySchema = z.object({
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const parseResult = querySchema.safeParse({
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

  const { search, page, limit } = parseResult.data
  const where = {
    isDeleted: false,
    ...(search && {
      OR: [
        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { address: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { managerName: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    }),
  }

  try {
    if (page) {
      const [totalCount, stores] = await Promise.all([
        prisma.store.count({ where }),
        prisma.store.findMany({
          where,
          include: storeInclude,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ])

      const totalPages = Math.ceil(totalCount / limit)

      return apiSuccess({
        stores,
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

    const stores = await prisma.store.findMany({
      where,
      include: storeInclude,
      orderBy: { createdAt: "desc" },
    })

    return apiSuccess(stores)
  } catch (error) {
    console.error("[/api/stores] GET error:", error)
    return ApiErrors.internalError("매장 목록을 불러오지 못했습니다")
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult
  const { user } = authResult

  try {
    const body = await request.json()
    const parseResult = createStoreSchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { items, templateId, assignedUserId, ...storeData } = parseResult.data

    if (templateId) {
      const template = await prisma.storeTemplate.findUnique({
        where: { id: templateId },
        select: { userId: true },
      })
      if (!template) {
        return ApiErrors.notFound("코스를 찾을 수 없습니다")
      }
      if (template.userId !== user.id) {
        return ApiErrors.forbidden("다른 사용자의 코스는 사용할 수 없습니다")
      }
    }

    const store = await prisma.$transaction(async (tx) => {
      const newStore = await tx.store.create({
        data: {
          ...storeData,
          assignedUserId: assignedUserId ?? null,
        },
      })

      if (items && items.length > 0) {
        await tx.storeItem.createMany({
          data: items.map((item) => ({
            storeId: newStore.id,
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
          })),
        })
      }

      if (templateId) {
        const lastMember = await tx.storeTemplateMember.findFirst({
          where: { templateId },
          orderBy: { order: "desc" },
          select: { order: true },
        })
        const nextOrder = (lastMember?.order ?? -1) + 1

        await tx.storeTemplateMember.create({
          data: {
            templateId,
            storeId: newStore.id,
            order: nextOrder,
          },
        })
      }

      return tx.store.findFirst({
        where: { id: newStore.id, isDeleted: false },
        include: storeInclude,
      })
    })

    return apiSuccess(store, 201)
  } catch (error) {
    console.error("[/api/stores] POST error:", error)
    return ApiErrors.internalError("매장 생성 중 오류가 발생했습니다")
  }
}
