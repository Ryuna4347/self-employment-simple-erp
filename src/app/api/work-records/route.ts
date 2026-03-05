import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { startOfDay, endOfDay, parseISO } from "date-fns"
import type { Prisma } from "@/generated/prisma/client"

const querySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  userId: z.string().optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

// 근무기록 생성 스키마
const createWorkRecordSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
  storeId: z.string().optional(), // 매장 검색 선택 시 (optional)
  storeName: z.string().min(1, "매장명을 입력해주세요"), // 필수
  storeAddress: z.string().optional(), // 주소 (선택)
  paymentType: z.enum(["CASH", "ACCOUNT", "CARD"]), // 결제방식 (필수)
  managerName: z.string().optional(), // 담당자 (선택)
  collectionStatus: z.enum(["UNCOLLECTED", "COLLECTED", "CLOSED"]),
  imageUrl: z.string().url().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "품명을 입력해주세요"),
        amount: z.number().int().min(0, "금액은 0 이상이어야 합니다"),
        quantity: z.number().int().min(1, "수량은 1 이상이어야 합니다"),
      })
    ),
}).refine(
  (data) => {
    // 휴업&폐업이면 빈 배열 허용, 아니면 최소 1개 필요
    if (data.collectionStatus === "CLOSED") {
      return true
    }
    return data.items.length >= 1
  },
  { message: "최소 1개 이상의 품목이 필요합니다", path: ["items"] }
)

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams

  const parseResult = querySchema.safeParse({
    date: searchParams.get("date"),
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

  const { date, userId: requestedUserId, search, page, limit } = parseResult.data
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

  // 기본 날짜+사용자 필터 (summary용, 검색 제외)
  const baseWhere: Prisma.WorkRecordWhereInput = {
    date: { gte: dateStart, lte: dateEnd },
    ...(userIdFilter && { userId: userIdFilter }),
  }

  // 검색 포함 필터 (페이지네이션용)
  const pageWhere: Prisma.WorkRecordWhereInput = {
    ...baseWhere,
    ...(search ? { storeNameSnapshot: { contains: search, mode: "insensitive" } } : {}),
  }

  // 1. 전체 날짜 통계(summary) + 페이지네이션 레코드 병렬 조회
  const [allRecords, totalCount, pageRecords] = await Promise.all([
    // summary용 (전체 날짜 기준, 검색 제외)
    prisma.workRecord.findMany({
      where: baseWhere,
      select: {
        collectionStatus: true,
        paymentTypeSnapshot: true,
        items: { select: { amount: true } },
      },
    }),
    // 검색 적용된 전체 건수
    prisma.workRecord.count({ where: pageWhere }),
    // 페이지네이션된 레코드
    prisma.workRecord.findMany({
      where: pageWhere,
      include: {
        store: { select: { id: true, name: true, address: true, managerName: true } },
        items: { select: { id: true, name: true, amount: true, quantity: true } },
        user: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "asc" }, { sortOrder: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  // summary 계산 (전체 날짜 기준)
  let totalSales = 0
  let collectedSales = 0
  let uncollectedSales = 0
  const collectedByPaymentType = { CASH: 0, ACCOUNT: 0, CARD: 0 }

  for (const r of allRecords) {
    const amount = r.items.reduce((sum, item) => sum + item.amount, 0)
    totalSales += amount
    if (r.collectionStatus === "COLLECTED") {
      collectedSales += amount
      collectedByPaymentType[r.paymentTypeSnapshot] += amount
    } else if (r.collectionStatus === "UNCOLLECTED") {
      uncollectedSales += amount
    }
  }

  // 매장별 미수 집계 (현재 날짜 제외)
  const pageStoreIds = [...new Set(
    pageRecords.map(r => r.storeId).filter((id): id is string => id !== null)
  )]

  let storeOutstandingMap = new Map<string, { count: number; totalAmount: number }>()

  if (pageStoreIds.length > 0) {
    const outstandingRecords = await prisma.workRecord.findMany({
      where: {
        storeId: { in: pageStoreIds },
        collectionStatus: "UNCOLLECTED",
        NOT: { date: { gte: dateStart, lte: dateEnd } },
      },
      select: {
        storeId: true,
        items: { select: { amount: true } },
      },
    })

    for (const record of outstandingRecords) {
      const existing = storeOutstandingMap.get(record.storeId!) || { count: 0, totalAmount: 0 }
      existing.count++
      existing.totalAmount += record.items.reduce((sum, item) => sum + item.amount, 0)
      storeOutstandingMap.set(record.storeId!, existing)
    }
  }

  const records = pageRecords.map(r => ({
    ...r,
    storeOutstanding: r.storeId ? storeOutstandingMap.get(r.storeId) ?? null : null,
  }))

  const totalPages = Math.ceil(totalCount / limit)

  return apiSuccess({
    records,
    summary: {
      totalVisits: allRecords.length,
      totalSales,
      collectedSales,
      uncollectedSales,
      collectedByPaymentType,
    },
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

  const { date, storeId, storeName, storeAddress, paymentType, managerName, collectionStatus, imageUrl, note, items } = parseResult.data

  // storeId가 있으면 매장 존재 여부 확인 + 동일 날짜 중복 체크
  if (storeId) {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isDeleted: true },
    })

    if (!store || store.isDeleted) {
      return ApiErrors.notFound("선택한 매장을 찾을 수 없습니다")
    }

    // 동일 날짜 + 동일 매장 중복 체크
    const targetDate = parseISO(date)
    const existing = await prisma.workRecord.findFirst({
      where: {
        userId: user.id,
        storeId,
        date: { gte: startOfDay(targetDate), lte: endOfDay(targetDate) },
      },
      select: { id: true },
    })

    if (existing) {
      return ApiErrors.alreadyExists("해당 날짜에 이미 등록된 매장입니다")
    }
  }

  // 휴업&폐업 시 items 강제 비움
  const isClosed = collectionStatus === "CLOSED"
  const finalItems = isClosed ? [] : items

  // 트랜잭션으로 WorkRecord + RecordItem 생성
  const workRecord = await prisma.workRecord.create({
    data: {
      date: parseISO(date),
      // storeId가 있으면 store connect, 없으면 관계 생략
      ...(storeId ? { store: { connect: { id: storeId } } } : {}),
      user: { connect: { id: user.id } },
      collectionStatus,
      ...(collectionStatus === "COLLECTED" && {
        collectedAt: new Date(),
        collectedBy: { connect: { id: user.id } },
      }),
      imageUrl: imageUrl || null,
      note: note || null,
      // 스냅샷 필드 (항상 요청값 사용)
      storeNameSnapshot: storeName,
      storeAddressSnapshot: storeAddress || null,
      managerNameSnapshot: managerName || null,
      paymentTypeSnapshot: paymentType,
      ...(finalItems.length > 0 && {
        items: {
          create: finalItems.map((item) => ({
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
          })),
        },
      }),
    },
    include: {
      store: { select: { id: true, name: true, address: true, managerName: true } },
      items: { select: { id: true, name: true, amount: true, quantity: true } },
      user: { select: { id: true, name: true } },
      collectedBy: { select: { id: true, name: true } },
    },
  })

  return apiSuccess(workRecord, 201)
}
