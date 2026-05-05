import { NextRequest } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim()

    if (!q) {
      return apiSuccess({ parties: [] })
    }

    const parties = await prisma.taxParty.findMany({
      where: {
        isDeleted: false,
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { bizNo: { contains: q } },
        ],
      },
      orderBy: [{ name: "asc" }],
      take: 20,
      select: {
        id: true,
        name: true,
        bizNo: true,
      },
    })

    return apiSuccess({ parties })
  } catch (error) {
    console.error("[/api/tax-parties/search] GET error:", error)
    return ApiErrors.internalError("사업자 검색 중 오류가 발생했습니다")
  }
}
