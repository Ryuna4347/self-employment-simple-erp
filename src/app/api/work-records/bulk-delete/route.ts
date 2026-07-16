import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const bulkDeleteByIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "삭제할 기록을 선택해주세요").max(500),
})

// 근무기록 선택 삭제 (ID 배열 기반)
// 일반 사용자는 본인의 UNCOLLECTED 기록만 삭제할 수 있고, 관리자는 모든 상태를 삭제할 수 있다.
// 권한이 없어 삭제되지 않은 건수는 skipped로 반환한다.
export async function POST(request: Request) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult

  const body = await request.json()
  const parsed = bulkDeleteByIdsSchema.safeParse(body)
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const uniqueIds = [...new Set(parsed.data.ids)]
  const isAdmin = user.role === "ADMIN"

  // 일반 사용자는 본인 소유 + UNCOLLECTED 만 삭제 가능 (단건 DELETE 와 동일한 권한 모델)
  const result = await prisma.workRecord.deleteMany({
    where: {
      id: { in: uniqueIds },
      ...(isAdmin ? {} : { userId: user.id, collectionStatus: "UNCOLLECTED" }),
    },
  })

  return apiSuccess({
    deleted: result.count,
    skipped: uniqueIds.length - result.count,
  })
}
