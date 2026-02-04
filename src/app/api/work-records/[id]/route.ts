import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 근무기록 수정 스키마
const updateWorkRecordSchema = z.object({
  isCollected: z.boolean().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "품명을 입력해주세요"),
        unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다"),
        quantity: z.number().int().min(1, "수량은 1 이상이어야 합니다"),
      })
    )
    .min(1, "최소 1개 이상의 품목이 필요합니다")
    .optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// 근무기록 수정
export async function PUT(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await context.params

  // 근무기록 존재 여부 확인
  const workRecord = await prisma.workRecord.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!workRecord) {
    return ApiErrors.notFound("근무기록을 찾을 수 없습니다")
  }

  // 소유권 확인 (본인 또는 관리자만 수정 가능)
  if (workRecord.userId !== user.id && user.role !== "ADMIN") {
    return ApiErrors.forbidden("이 근무기록을 수정할 권한이 없습니다")
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return ApiErrors.validationError("유효한 JSON 형식이 아닙니다")
  }

  const parseResult = updateWorkRecordSchema.safeParse(body)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { isCollected, note, items } = parseResult.data

  // 트랜잭션으로 업데이트
  const updatedRecord = await prisma.$transaction(async (tx) => {
    // items가 있으면 기존 품목 삭제 후 새로 생성
    if (items) {
      await tx.recordItem.deleteMany({
        where: { workRecordId: id },
      })
    }

    return tx.workRecord.update({
      where: { id },
      data: {
        ...(isCollected !== undefined && { isCollected }),
        ...(note !== undefined && { note: note || null }),
        ...(items && {
          items: {
            create: items.map((item) => ({
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            })),
          },
        }),
      },
      include: {
        store: { select: { id: true, name: true, address: true, managerName: true } },
        items: { select: { id: true, name: true, unitPrice: true, quantity: true } },
        user: { select: { id: true, name: true } },
      },
    })
  })

  return apiSuccess(updatedRecord)
}

// 근무기록 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await context.params

  // 근무기록 존재 여부 확인
  const workRecord = await prisma.workRecord.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })

  if (!workRecord) {
    return ApiErrors.notFound("근무기록을 찾을 수 없습니다")
  }

  // 소유권 확인 (본인 또는 관리자만 삭제 가능)
  if (workRecord.userId !== user.id && user.role !== "ADMIN") {
    return ApiErrors.forbidden("이 근무기록을 삭제할 권한이 없습니다")
  }

  // Cascade로 RecordItem도 자동 삭제
  await prisma.workRecord.delete({
    where: { id },
  })

  return apiSuccess({ deleted: true })
}
