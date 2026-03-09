import { NextRequest } from "next/server"
import { format } from "date-fns"
import { toKSTLocal } from "@/lib/date-utils"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 매장의 UNCOLLECTED 레코드 목록 (수금 확인 요청 모달용)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const storeId = request.nextUrl.searchParams.get("storeId")
  if (!storeId) {
    return ApiErrors.validationError("storeId는 필수입니다")
  }

  const records = await prisma.workRecord.findMany({
    where: {
      storeId,
      collectionStatus: "UNCOLLECTED",
    },
    select: {
      id: true,
      date: true,
      items: { select: { name: true, amount: true, quantity: true } },
    },
    orderBy: { date: "asc" },
  })

  const data = records.map((r) => ({
    id: r.id,
    date: format(toKSTLocal(r.date), "yyyy-MM-dd"),
    items: r.items,
    totalAmount: r.items.reduce((sum, item) => sum + item.amount, 0),
  }))

  return apiSuccess(data)
}
