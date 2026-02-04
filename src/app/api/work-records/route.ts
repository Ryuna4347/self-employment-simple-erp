import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { startOfDay, endOfDay, parseISO } from "date-fns"

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  userId: z.string().optional(),
})

// 근무기록 생성 스키마
const createWorkRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  storeId: z.string().min(1, "매장을 선택해주세요"),
  isCollected: z.boolean(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "품명을 입력해주세요"),
        unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다"),
        quantity: z.number().int().min(1, "수량은 1 이상이어야 합니다"),
      })
    )
    .min(1, "최소 1개 이상의 품목이 필요합니다"),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams

  const parseResult = querySchema.safeParse({
    date: searchParams.get("date"),
    userId: searchParams.get("userId") || undefined,
  })

  if (!parseResult.success) {
    return ApiErrors.validationError(parseResult.error.issues[0].message)
  }

  const { date, userId: requestedUserId } = parseResult.data
  const isAdmin = user.role === "ADMIN"

  // 권한 체크
  if (requestedUserId && requestedUserId !== user.id && requestedUserId !== "all" && !isAdmin) {
    return ApiErrors.forbidden("다른 사용자의 기록을 조회할 권한이 없습니다")
  }
  if (requestedUserId === "all" && !isAdmin) {
    return ApiErrors.forbidden("전체 기록을 조회할 권한이 없습니다")
  }

  const targetDate = parseISO(date)
  const dateStart = startOfDay(targetDate)
  const dateEnd = endOfDay(targetDate)

  let userIdFilter: string | undefined
  if (!requestedUserId) {
    userIdFilter = user.id
  } else if (requestedUserId === "all") {
    userIdFilter = undefined
  } else {
    userIdFilter = requestedUserId
  }

  const workRecords = await prisma.workRecord.findMany({
    where: {
      date: { gte: dateStart, lte: dateEnd },
      ...(userIdFilter && { userId: userIdFilter }),
    },
    include: {
      store: { select: { id: true, name: true, address: true, managerName: true } },
      items: { select: { id: true, name: true, unitPrice: true, quantity: true } },
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  })

  return apiSuccess(workRecords)
}

// 근무기록 생성
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiErrors.validationError("유효한 JSON 형식이 아닙니다")
  }

  const parseResult = createWorkRecordSchema.safeParse(body)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { date, storeId, isCollected, note, items } = parseResult.data

  // 매장 존재 여부 및 PaymentType 조회
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { id: true, PaymentType: true },
  })

  if (!store) {
    return ApiErrors.notFound("매장을 찾을 수 없습니다")
  }

  // 트랜잭션으로 WorkRecord + RecordItem 생성
  const workRecord = await prisma.workRecord.create({
    data: {
      date: parseISO(date),
      storeId,
      userId: user.id,
      isCollected,
      note: note || null,
      paymentTypeSnapshot: store.PaymentType,
      items: {
        create: items.map((item) => ({
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      store: { select: { id: true, name: true, address: true, managerName: true } },
      items: { select: { id: true, name: true, unitPrice: true, quantity: true } },
      user: { select: { id: true, name: true } },
    },
  })

  return apiSuccess(workRecord, 201)
}
