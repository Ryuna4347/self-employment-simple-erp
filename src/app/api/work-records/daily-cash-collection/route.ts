import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { getCashCollectionByEmployee } from "@/lib/reports/daily-cash-collection"

const querySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date 형식이 올바르지 않습니다 (YYYY-MM-DD)"),
})

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const parsed = querySchema.safeParse({
    date: request.nextUrl.searchParams.get("date") ?? "",
  })
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return ApiErrors.validationError(first.message, [
      { field: first.path.join("."), message: first.message },
    ])
  }

  try {
    const result = await getCashCollectionByEmployee(parsed.data.date)
    return apiSuccess(result)
  } catch (error) {
    console.error("일별 현금 수금 조회 오류:", error)
    return ApiErrors.internalError("일별 현금 수금 조회 중 오류가 발생했습니다")
  }
}
