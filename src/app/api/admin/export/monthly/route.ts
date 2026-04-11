import { NextRequest } from "next/server"
import { z } from "zod"
import { requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
import { ApiErrors } from "@/lib/api-response"
import { generateMonthlyReport } from "@/lib/excel/monthly-report"

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export async function GET(request: NextRequest) {
  // 관리자 권한 확인
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  const searchParams = request.nextUrl.searchParams

  const parseResult = querySchema.safeParse({
    year: searchParams.get("year"),
    month: searchParams.get("month"),
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { year, month } = parseResult.data

  try {
    const buffer = await generateMonthlyReport(year, month)
    const fileName = `근무기록_${year}년_${month}월.xlsx`
    const encodedFileName = encodeURIComponent(fileName)

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`,
        "Content-Length": buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("월간 엑셀 생성 오류:", error)
    return ApiErrors.internalError("엑셀 파일 생성 중 오류가 발생했습니다")
  }
}
