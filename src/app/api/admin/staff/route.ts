import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess } from "@/lib/api-response"

export async function GET() {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const staff = await prisma.user.findMany({
    where: {
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      loginId: true,
      role: true,
      inviteCode: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  })

  // 등록 상태 판단 + 대기 중 사용자 loginId 숨기기
  const result = staff.map((user) => {
    const isRegistered = user.inviteCode === null
    return {
      id: user.id,
      name: user.name,
      loginId: isRegistered ? user.loginId : null,
      role: user.role,
      isRegistered,
      createdAt: user.createdAt.toISOString(),
    }
  })

  return apiSuccess(result)
}
