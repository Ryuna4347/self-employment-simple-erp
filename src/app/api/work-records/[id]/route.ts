import { NextRequest } from "next/server"
import { z } from "zod"
import { startOfDay } from "date-fns"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 근무기록 수정 스키마
const updateWorkRecordSchema = z.object({
  collectionStatus: z.enum(["UNCOLLECTED", "COLLECTED", "CLOSED"]).optional(),
  imageUrl: z.string().url().nullable().optional(),
  note: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "품명을 입력해주세요"),
        amount: z.number().int().min(0, "금액은 0 이상이어야 합니다"),
        quantity: z.number().int().min(1, "수량은 1 이상이어야 합니다"),
      })
    )
    .optional(),
}).refine(
  (data) => {
    // collectionStatus와 items가 동시에 있을 때만 검증
    if (data.collectionStatus && data.items !== undefined) {
      if (data.collectionStatus === "CLOSED") {
        return true // 휴업&폐업이면 빈 배열 허용
      }
      return data.items.length >= 1
    }
    // items만 있을 때
    if (data.items !== undefined) {
      return data.items.length >= 1
    }
    return true
  },
  { message: "최소 1개 이상의 품목이 필요합니다", path: ["items"] }
)

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
    select: { id: true, userId: true, collectionStatus: true, createdAt: true, date: true, storeId: true },
  })

  if (!workRecord) {
    return ApiErrors.notFound("근무기록을 찾을 수 없습니다")
  }

  // 소유권 확인 (본인 또는 관리자만 수정 가능)
  if (workRecord.userId !== user.id && user.role !== "ADMIN") {
    return ApiErrors.forbidden("이 근무기록을 수정할 권한이 없습니다")
  }

  // 미수 상태가 아닌 기록은 관리자만 수정 가능
  if (workRecord.collectionStatus !== "UNCOLLECTED" && user.role !== "ADMIN") {
    return ApiErrors.forbidden("미수 상태가 아닌 근무기록은 관리자만 수정할 수 있습니다")
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

  const { collectionStatus, imageUrl, note, items } = parseResult.data

  // 일반 사용자의 직접 수금처리 제한
  if (collectionStatus === "COLLECTED" && workRecord.collectionStatus === "UNCOLLECTED" && user.role !== "ADMIN") {
    // 1. 시간 제한: max(createdAt, date) 기준 24시간 이내인지 확인
    const referenceDate = new Date(Math.max(
      workRecord.createdAt.getTime(),
      workRecord.date.getTime()
    ))
    const oneDayLater = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000)
    const now = new Date()

    if (now > oneDayLater) {
      return ApiErrors.forbidden("수금 처리 기한이 지났습니다. 수금 확인 요청을 이용해주세요.")
    }

    // 2. 같은 매장에 이전 날짜의 미수금이 있는지 확인
    if (workRecord.storeId) {
      const previousUncollected = await prisma.workRecord.count({
        where: {
          storeId: workRecord.storeId,
          collectionStatus: "UNCOLLECTED",
          date: { lt: startOfDay(workRecord.date) },
          id: { not: workRecord.id },
        },
      })

      if (previousUncollected > 0) {
        return ApiErrors.forbidden("이전 미수금이 존재합니다. 수금 확인 요청을 이용해주세요.")
      }
    }
  }

  // 수금 추적 필드 결정
  let collectionTrackingData: { collectedAt: Date | null; collectedByUserId: string | null } | undefined

  if (collectionStatus !== undefined) {
    if (collectionStatus === "COLLECTED" && workRecord.collectionStatus !== "COLLECTED") {
      // UNCOLLECTED/CLOSED → COLLECTED: 수금 시점 + 수금자 기록
      collectionTrackingData = { collectedAt: new Date(), collectedByUserId: user.id }
    } else if (collectionStatus !== "COLLECTED" && workRecord.collectionStatus === "COLLECTED") {
      // COLLECTED → UNCOLLECTED/CLOSED: 초기화
      collectionTrackingData = { collectedAt: null, collectedByUserId: null }
    }
  }

  // 휴업&폐업으로 변경 시 items 강제 삭제
  const isClosed = collectionStatus === "CLOSED"

  // 트랜잭션으로 업데이트
  const updatedRecord = await prisma.$transaction(async (tx) => {
    // 휴업/폐업 변경 시 기존 품목 삭제
    if (isClosed) {
      await tx.recordItem.deleteMany({
        where: { workRecordId: id },
      })
    } else if (items) {
      // items가 있으면 기존 품목 삭제 후 새로 생성
      await tx.recordItem.deleteMany({
        where: { workRecordId: id },
      })
    }

    return tx.workRecord.update({
      where: { id },
      data: {
        ...(collectionStatus !== undefined && { collectionStatus }),
        ...(collectionTrackingData && collectionTrackingData),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(note !== undefined && { note: note || null }),
        ...(!isClosed && items && {
          items: {
            create: items.map((item) => ({
              name: item.name,
              amount: item.amount,
              quantity: item.quantity,
            })),
          },
        }),
      },
      include: {
        store: { select: { id: true, name: true, address: true, managerName: true } },
        items: { select: { id: true, name: true, amount: true, quantity: true } },
        user: { select: { id: true, name: true } },
        collectedBy: { select: { id: true, name: true } },
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
    select: { id: true, userId: true, collectionStatus: true },
  })

  if (!workRecord) {
    return ApiErrors.notFound("근무기록을 찾을 수 없습니다")
  }

  // 소유권 확인 (본인 또는 관리자만 삭제 가능)
  if (workRecord.userId !== user.id && user.role !== "ADMIN") {
    return ApiErrors.forbidden("이 근무기록을 삭제할 권한이 없습니다")
  }

  // 미수 상태가 아닌 기록은 관리자만 삭제 가능
  if (workRecord.collectionStatus !== "UNCOLLECTED" && user.role !== "ADMIN") {
    return ApiErrors.forbidden("미수 상태가 아닌 근무기록은 관리자만 삭제할 수 있습니다")
  }

  // Cascade로 RecordItem도 자동 삭제
  await prisma.workRecord.delete({
    where: { id },
  })

  return apiSuccess({ deleted: true })
}
