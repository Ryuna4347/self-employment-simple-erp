import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { ApiErrors } from "@/lib/api-response"
import { startOfMonth, endOfMonth, format } from "date-fns"
import type { Prisma } from "@/generated/prisma/client"

// 날짜별 필터 스키마
const dateFilterSchema = z.object({
  filter: z.literal("date"),
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// 매장별 필터 스키마
const storeFilterSchema = z.object({
  filter: z.literal("store"),
  storeName: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const querySchema = z.discriminatedUnion("filter", [
  dateFilterSchema,
  storeFilterSchema,
])

// 레코드 항목 합계 계산
function calcTotalAmount(items: { amount: number }[]) {
  return items.reduce((sum, item) => sum + item.amount, 0)
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const rawFilter = searchParams.get("filter") ?? "date"

    const parseResult = querySchema.safeParse({
      filter: rawFilter,
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
      storeName: searchParams.get("storeName") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    })

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const params = parseResult.data

    if (params.filter === "date") {
      return handleDateFilter(params)
    } else {
      return handleStoreFilter(params)
    }
  } catch (error) {
    console.error("미수금 데이터 조회 오류:", error)
    return ApiErrors.internalError("미수금 데이터 조회 중 오류가 발생했습니다")
  }
}

/**
 * 날짜별 필터: 레코드 단위 페이지네이션
 */
async function handleDateFilter(params: z.infer<typeof dateFilterSchema>) {
  const { year, month, page, limit } = params
  const targetDate = new Date(year, month - 1, 1)
  const dateStart = startOfMonth(targetDate)
  const dateEnd = endOfMonth(targetDate)

  const where: Prisma.WorkRecordWhereInput = {
    collectionStatus: "UNCOLLECTED",
    date: { gte: dateStart, lte: dateEnd },
  }

  // 요약 쿼리 + 페이지 쿼리 병렬 실행
  const [summaryRecords, pageRecords] = await Promise.all([
    prisma.workRecord.findMany({
      where,
      select: { items: { select: { amount: true } } },
    }),
    prisma.workRecord.findMany({
      where,
      include: {
        items: true,
        user: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ])

  const totalCount = summaryRecords.length
  const totalOutstanding = summaryRecords.reduce(
    (sum, r) => sum + calcTotalAmount(r.items),
    0,
  )

  const records = pageRecords.map((record) => ({
    id: record.id,
    date: format(record.date, "yyyy-MM-dd"),
    storeNameSnapshot: record.storeNameSnapshot,
    storeAddressSnapshot: record.storeAddressSnapshot,
    managerNameSnapshot: record.managerNameSnapshot,
    paymentTypeSnapshot: record.paymentTypeSnapshot,
    collectionStatus: record.collectionStatus,
    totalAmount: calcTotalAmount(record.items),
    userName: record.user.name,
  }))

  const totalPages = Math.ceil(totalCount / limit)

  return NextResponse.json({
    success: true,
    data: {
      records,
      summary: { totalOutstanding, count: totalCount },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        unit: "record" as const,
      },
    },
  })
}

/**
 * 매장별 필터: 매장 단위 페이지네이션
 * 한 매장의 모든 레코드가 항상 같은 페이지에 표시된다.
 */
async function handleStoreFilter(params: z.infer<typeof storeFilterSchema>) {
  const { storeName, page, limit } = params

  // 매장 검색 조건
  const where: Prisma.WorkRecordWhereInput = {
    collectionStatus: "UNCOLLECTED",
    storeNameSnapshot: storeName
      ? { contains: storeName, mode: "insensitive" }
      : { not: null },
  }

  // 1. 매장명 목록 + 요약 + 상세 레코드를 병렬로 조회
  // 매장명 목록은 items 없이 경량 조회
  const [allStoreNames, summaryRecords] = await Promise.all([
    prisma.workRecord.findMany({
      where,
      select: { storeNameSnapshot: true },
      distinct: ["storeNameSnapshot"],
      orderBy: { storeNameSnapshot: "asc" },
    }),
    prisma.workRecord.findMany({
      where,
      select: { items: { select: { amount: true } } },
    }),
  ])

  const totalStoreCount = allStoreNames.length
  const totalPages = Math.ceil(totalStoreCount / limit)
  const totalOutstanding = summaryRecords.reduce(
    (sum, r) => sum + calcTotalAmount(r.items),
    0,
  )
  const totalRecordCount = summaryRecords.length

  // 2. 현재 페이지 매장 결정
  const pageStoreNames = allStoreNames
    .slice((page - 1) * limit, page * limit)
    .map((r) => r.storeNameSnapshot)
    .filter((name): name is string => name !== null)

  // 3. 현재 페이지 매장의 상세 레코드 조회
  const pageRecords = pageStoreNames.length > 0
    ? await prisma.workRecord.findMany({
        where: {
          collectionStatus: "UNCOLLECTED",
          storeNameSnapshot: { in: pageStoreNames },
        },
        include: {
          items: true,
          user: { select: { name: true } },
        },
        orderBy: [
          { storeNameSnapshot: "asc" },
          { date: "desc" },
        ],
      })
    : []

  const records = pageRecords.map((record) => ({
    id: record.id,
    date: format(record.date, "yyyy-MM-dd"),
    storeNameSnapshot: record.storeNameSnapshot,
    storeAddressSnapshot: record.storeAddressSnapshot,
    managerNameSnapshot: record.managerNameSnapshot,
    paymentTypeSnapshot: record.paymentTypeSnapshot,
    collectionStatus: record.collectionStatus,
    totalAmount: calcTotalAmount(record.items),
    userName: record.user.name,
  }))

  return NextResponse.json({
    success: true,
    data: {
      records,
      summary: { totalOutstanding, count: totalRecordCount },
      pagination: {
        page,
        limit,
        totalCount: totalStoreCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        unit: "store" as const,
      },
    },
  })
}
