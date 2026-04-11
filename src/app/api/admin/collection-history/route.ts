import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess } from "@/lib/api-response"
import { format } from "date-fns"
import { startOfMonthKST, endOfMonthKST, toKSTLocal } from "@/lib/date-utils"

// 수금 이력 조회 (직접 수금 + 수금 확인 요청 승인 통합)
export async function GET(request: NextRequest) {
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams
  const year = Number(searchParams.get("year") || new Date().getFullYear())
  const month = Number(searchParams.get("month") || new Date().getMonth() + 1)
  const userId = searchParams.get("userId") || undefined
  const search = searchParams.get("search") || undefined
  const page = Math.max(1, Number(searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || "20")))

  const periodStart = startOfMonthKST(year, month)
  const periodEnd = endOfMonthKST(year, month)

  // 1. 직접 수금 레코드 (CollectionRequestItem에 속하지 않는 COLLECTED 레코드)
  const directRecords = await prisma.workRecord.findMany({
    where: {
      collectionStatus: "COLLECTED",
      collectedAt: { gte: periodStart, lte: periodEnd },
      collectionRequestItems: { none: {} },
      ...(userId ? { collectedByUserId: userId } : {}),
      ...(search ? { storeNameSnapshot: { contains: search, mode: "insensitive" as const } } : {}),
    },
    select: {
      id: true,
      date: true,
      storeNameSnapshot: true,
      collectedAt: true,
      collectedByUserId: true,
      collectedBy: { select: { id: true, name: true } },
      items: { select: { name: true, amount: true, quantity: true } },
    },
    orderBy: { collectedAt: "desc" },
  })

  // 2. 승인된 CollectionRequest
  const approvedRequests = await prisma.collectionRequest.findMany({
    where: {
      status: "APPROVED",
      createdAt: { gte: periodStart, lte: periodEnd },
      ...(userId ? { requesterId: userId } : {}),
      ...(search ? { storeNameSnapshot: { contains: search, mode: "insensitive" as const } } : {}),
    },
    include: {
      requester: { select: { id: true, name: true } },
      items: {
        include: {
          workRecord: {
            select: {
              id: true,
              date: true,
              collectedAt: true,
              items: { select: { name: true, amount: true, quantity: true } },
            },
          },
        },
      },
    },
    orderBy: { reviewedAt: "desc" },
  })

  // 통합 목록 생성
  type HistoryEntry = {
    type: "direct" | "request"
    collectedByName: string
    collectedAt: string
    storeNameSnapshot: string
    totalAmount: number
    workRecord?: {
      id: string
      date: string
      items: { name: string; amount: number; quantity: number }[]
    }
    records?: {
      id: string
      date: string
      totalAmount: number
      items: { name: string; amount: number; quantity: number }[]
    }[]
  }

  const entries: HistoryEntry[] = []

  // 직접 수금 → 개별 카드
  for (const r of directRecords) {
    entries.push({
      type: "direct",
      collectedByName: r.collectedBy?.name ?? "알 수 없음",
      collectedAt: r.collectedAt ? format(toKSTLocal(r.collectedAt), "yyyy-MM-dd HH:mm") : "",
      storeNameSnapshot: r.storeNameSnapshot ?? "알 수 없음",
      totalAmount: r.items.reduce((sum, item) => sum + item.amount, 0),
      workRecord: {
        id: r.id,
        date: format(toKSTLocal(r.date), "yyyy-MM-dd"),
        items: r.items,
      },
    })
  }

  // 수금 확인 요청 승인 → 그룹 카드
  for (const req of approvedRequests) {
    const requestRecords = req.items
      .map((item) => ({
        id: item.workRecord.id,
        date: format(toKSTLocal(item.workRecord.date), "yyyy-MM-dd"),
        totalAmount: item.workRecord.items.reduce((sum, ri) => sum + ri.amount, 0),
        items: item.workRecord.items,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 총액은 마지막 레코드만 유의미 (나머지는 0)
    const totalAmount = requestRecords.reduce((sum, r) => sum + r.totalAmount, 0)

    entries.push({
      type: "request",
      collectedByName: req.requester.name,
      collectedAt: format(toKSTLocal(req.createdAt), "yyyy-MM-dd HH:mm"),
      storeNameSnapshot: req.storeNameSnapshot,
      totalAmount,
      records: requestRecords,
    })
  }

  // collectedAt 기준 정렬 (최근 순)
  entries.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt))

  // 페이지네이션 (메모리 기반)
  const totalCount = entries.length
  const totalPages = Math.ceil(totalCount / limit)
  const paginatedEntries = entries.slice((page - 1) * limit, page * limit)

  return apiSuccess({
    items: paginatedEntries,
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
