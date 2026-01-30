import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess } from "@/lib/api-response"

export async function GET() {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      password: { not: null },
    },
    select: { id: true, name: true, loginId: true, role: true },
    orderBy: { name: "asc" },
  })

  return apiSuccess(users)
}
