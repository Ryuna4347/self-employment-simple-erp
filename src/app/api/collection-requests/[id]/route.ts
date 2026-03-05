import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { format } from "date-fns"

interface RouteContext {
  params: Promise<{ id: string }>
}

// 수금 확인 요청 상세 조회 (관리자용)
export async function GET(request: NextRequest, context: RouteContext) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { id } = await context.params

  const collectionRequest = await prisma.collectionRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
      store: { select: { id: true, name: true, address: true } },
      items: {
        include: {
          workRecord: {
            select: {
              id: true,
              date: true,
              storeNameSnapshot: true,
              storeAddressSnapshot: true,
              collectionStatus: true,
              items: { select: { id: true, name: true, amount: true, quantity: true } },
            },
          },
        },
      },
    },
  })

  if (!collectionRequest) {
    return ApiErrors.notFound("수금 확인 요청을 찾을 수 없습니다")
  }

  // 날짜 포맷팅
  const data = {
    ...collectionRequest,
    createdAt: format(collectionRequest.createdAt, "yyyy-MM-dd HH:mm"),
    reviewedAt: collectionRequest.reviewedAt
      ? format(collectionRequest.reviewedAt, "yyyy-MM-dd HH:mm")
      : null,
    items: collectionRequest.items.map((item) => ({
      ...item,
      workRecord: {
        ...item.workRecord,
        date: format(item.workRecord.date, "yyyy-MM-dd"),
        totalAmount: item.workRecord.items.reduce((sum, ri) => sum + ri.amount, 0),
      },
    })),
    totalAmount: collectionRequest.items.reduce((sum, item) => {
      return sum + item.workRecord.items.reduce((s, ri) => s + ri.amount, 0)
    }, 0),
  }

  return apiSuccess(data)
}
