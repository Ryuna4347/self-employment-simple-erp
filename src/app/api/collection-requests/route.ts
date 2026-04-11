import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireAdmin, requireAdminRead, requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 수금 확인 요청 생성 스키마
const createSchema = z.object({
  storeId: z.string().optional(),
  storeNameSnapshot: z.string().min(1, "매장명은 필수입니다"),
  workRecordIds: z.array(z.string()).min(1, "최소 1개 이상의 기록을 선택해주세요"),
  note: z.string().optional(),
})

// 수금 확인 요청 생성
export async function POST(request: NextRequest) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiErrors.validationError("유효한 JSON 형식이 아닙니다")
  }

  const parseResult = createSchema.safeParse(body)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message)
  }

  const { storeId, storeNameSnapshot, workRecordIds, note } = parseResult.data

  // 모든 workRecordId가 요청자 소유 + UNCOLLECTED + 같은 매장인지 검증
  const records = await prisma.workRecord.findMany({
    where: { id: { in: workRecordIds } },
    select: { id: true, userId: true, collectionStatus: true, storeId: true },
  })

  if (records.length !== workRecordIds.length) {
    return ApiErrors.validationError("일부 근무기록을 찾을 수 없습니다")
  }

  for (const record of records) {
    if (record.userId !== user.id) {
      return ApiErrors.forbidden("본인의 근무기록만 요청할 수 있습니다")
    }
    if (record.collectionStatus !== "UNCOLLECTED") {
      return ApiErrors.validationError("미수 상태인 기록만 요청할 수 있습니다")
    }
    if (storeId && record.storeId !== storeId) {
      return ApiErrors.validationError("같은 매장의 기록만 요청할 수 있습니다")
    }
  }

  // 같은 매장에 PENDING 요청이 이미 있는지 확인
  if (storeId) {
    const existingRequest = await prisma.collectionRequest.findFirst({
      where: { storeId, status: "PENDING" },
      select: { id: true },
    })
    if (existingRequest) {
      return ApiErrors.alreadyExists("해당 매장에 이미 대기 중인 수금 확인 요청이 있습니다")
    }
  }

  // 트랜잭션으로 CollectionRequest + Items 생성
  const collectionRequest = await prisma.$transaction(async (tx) => {
    return tx.collectionRequest.create({
      data: {
        storeId: storeId || null,
        storeNameSnapshot,
        requesterId: user.id,
        note: note || null,
        items: {
          create: workRecordIds.map((workRecordId) => ({ workRecordId })),
        },
      },
      include: {
        items: { select: { workRecordId: true } },
      },
    })
  })

  return apiSuccess(collectionRequest, 201)
}

// 수금 확인 요청 목록 조회 (관리자 + 열람자)
export async function GET(request: NextRequest) {
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const status = searchParams.get("status") || "PENDING"
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")))

  const where = {
    status: status as "PENDING" | "APPROVED" | "REJECTED",
  }

  const [requests, totalCount] = await Promise.all([
    prisma.collectionRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
        items: {
          include: {
            workRecord: {
              select: {
                id: true,
                date: true,
                items: { select: { name: true, amount: true, quantity: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.collectionRequest.count({ where }),
  ])

  // 각 요청의 총액 계산
  const data = requests.map((req) => {
    const totalAmount = req.items.reduce((sum, item) => {
      return sum + item.workRecord.items.reduce((s, ri) => s + ri.amount, 0)
    }, 0)

    return {
      ...req,
      totalAmount,
      recordCount: req.items.length,
    }
  })

  const totalPages = Math.ceil(totalCount / limit)

  return apiSuccess({
    requests: data,
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
