import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { dateToKSTMidnight } from "@/lib/date-utils"

// 적용 요청 스키마
const applySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/store-templates/[id]/apply
 * 코스 적용 (WorkRecord 일괄 생성)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    // 코스 조회
    const template = await prisma.storeTemplate.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { order: "asc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                address: true,
                managerName: true,
                PaymentType: true,
                isDeleted: true,
                storeItems: {
                  select: {
                    name: true,
                    amount: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!template) {
      return ApiErrors.notFound("코스을 찾을 수 없습니다")
    }

    const body = await request.json()

    // 입력 검증
    const parseResult = applySchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const { date } = parseResult.data
    const targetDate = dateToKSTMidnight(date)

    // 이미 해당 날짜에 같은 매장의 WorkRecord가 있는지 확인
    const existingRecords = await prisma.workRecord.findMany({
      where: {
        userId: user.id,
        date: targetDate,
        storeId: { in: template.members.map((m) => m.storeId) },
      },
      select: { storeId: true },
    })

    const existingStoreIds = new Set(existingRecords.map((r) => r.storeId))

    // 1. 중복되지 않는 매장 필터
    const afterDuplicateFilter = template.members.filter(
      (m) => !existingStoreIds.has(m.storeId)
    )

    // 1-1. 삭제된 매장 제외
    const afterDeleteFilter = afterDuplicateFilter.filter((m) => !m.store.isDeleted)

    // 1-2. 계좌이체인데 입금자 없는 매장 제외
    const noManagerStoreIds = new Set(
      afterDeleteFilter
        .filter((m) => m.store.PaymentType === "ACCOUNT" && !m.store.managerName?.trim())
        .map((m) => m.storeId)
    )
    const afterManagerFilter = afterDeleteFilter.filter((m) => !noManagerStoreIds.has(m.storeId))

    // 2. 생성 대상 확인
    const membersToCreate = afterManagerFilter

    if (membersToCreate.length === 0) {
      return apiSuccess({
        created: 0,
        skipped: existingStoreIds.size,
        workRecords: [],
      })
    }

    // WorkRecord + RecordItem 벌크 생성 (2회 INSERT로 최적화)
    const workRecords = await prisma.$transaction(async (tx) => {
      // 1. WorkRecord 벌크 생성
      const createdRecords = await tx.workRecord.createManyAndReturn({
        data: membersToCreate.map((member) => ({
          date: targetDate,
          storeId: member.storeId,
          userId: user.id,
          collectionStatus: "UNCOLLECTED" as const,
          storeNameSnapshot: member.store.name,
          storeAddressSnapshot: member.store.address,
          managerNameSnapshot: member.store.managerName,
          paymentTypeSnapshot: member.store.PaymentType,
          sortOrder: member.order,
        })),
      })

      // 2. storeId → workRecordId 매핑 후 RecordItem 벌크 생성
      const storeToRecordId = new Map(
        createdRecords.map((r) => [r.storeId, r.id])
      )
      const allItems = membersToCreate.flatMap((member) =>
        member.store.storeItems.map((item) => ({
          workRecordId: storeToRecordId.get(member.storeId)!,
          name: item.name,
          amount: item.amount,
          quantity: item.quantity,
        }))
      )
      if (allItems.length > 0) {
        await tx.recordItem.createMany({ data: allItems })
      }

      // 3. 응답용 관계 데이터 조회
      return tx.workRecord.findMany({
        where: { id: { in: createdRecords.map((r) => r.id) } },
        include: {
          store: { select: { id: true, name: true, address: true } },
        },
      })
    })

    return apiSuccess({
      created: workRecords.length,
      skipped: existingStoreIds.size,
      workRecords,
    })
  } catch (error) {
    console.error("코스 적용 오류:", error)
    return ApiErrors.internalError("코스 적용 중 오류가 발생했습니다")
  }
}
