import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const { id } = await params
  const { user: adminUser } = authResult

  // 자기 자신 삭제 방지
  if (id === adminUser.id) {
    return ApiErrors.validationError("자기 자신은 삭제할 수 없습니다")
  }

  // 대상 사용자 조회
  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isDeleted: true },
  })

  if (!targetUser || targetUser.isDeleted) {
    return ApiErrors.notFound("사용자를 찾을 수 없습니다")
  }

  // 관리자 삭제 방지
  if (targetUser.role === "ADMIN") {
    return ApiErrors.validationError("관리자 계정은 삭제할 수 없습니다")
  }

  // 트랜잭션: soft delete + 리프레시 토큰 전체 폐기
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    }),
    prisma.refreshToken.updateMany({
      where: {
        userId: id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ])

  return apiSuccess({ id }, 200, "직원이 삭제되었습니다")
}
