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
    // 본문 파싱은 DB와 무관하므로 먼저 해 두고, 코스 조회와 기존 기록 조회를 병렬로 실행한다.
    // 응답 우선순위는 기존과 같다: 코스 없음(404) → 잘못된 JSON(500) → 입력 검증 실패(400)
    let body: unknown = undefined
    let bodyError: unknown = null
    try {
      body = await request.json()
    } catch (error) {
      bodyError = error
    }
    const parseResult = bodyError === null ? applySchema.safeParse(body) : null
    const targetDate = parseResult?.success ? dateToKSTMidnight(parseResult.data.date) : null

    const [template, userRecordsOnDate] = await Promise.all([
      // 코스 조회
      prisma.storeTemplate.findUnique({
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
                  note: true,
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
      }),
      // 해당 날짜에 이미 있는 본인 근무기록의 매장 (코스 멤버 여부는 아래에서 거른다)
      targetDate
        ? prisma.workRecord.findMany({
            where: { userId: user.id, date: targetDate },
            select: { storeId: true },
          })
        : Promise.resolve([]),
    ])

    if (!template) {
      return ApiErrors.notFound("코스을 찾을 수 없습니다")
    }

    // 잘못된 JSON은 기존과 같이 500 처리 (아래 catch)
    if (bodyError !== null) {
      throw bodyError
    }

    // 입력 검증
    if (!parseResult?.success || !targetDate) {
      const firstError = parseResult?.error?.issues[0]
      const message = firstError?.message ?? "잘못된 요청입니다"
      return ApiErrors.validationError(message, [
        { field: firstError?.path.join(".") ?? "", message },
      ])
    }

    // 이미 해당 날짜에 같은 매장의 WorkRecord가 있는 코스 멤버 매장
    const memberStoreIds = new Set(template.members.map((m) => m.storeId))
    const existingStoreIds = new Set(
      userRecordsOnDate
        .map((r) => r.storeId)
        .filter((storeId): storeId is string => storeId !== null && memberStoreIds.has(storeId))
    )

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
    const createdRecords = await prisma.$transaction(async (tx) => {
      // 1. WorkRecord 벌크 생성
      const createdRecords = await tx.workRecord.createManyAndReturn({
        data: membersToCreate.map((member) => ({
          date: targetDate,
          storeId: member.storeId,
          userId: user.id,
          collectionStatus: "UNCOLLECTED" as const,
          // 매장 특이사항을 근무기록 메모 기본값으로 반영
          note: member.store.note?.trim() ? member.store.note : null,
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
          salesAmount: item.amount, // 매출 원금
          quantity: item.quantity,
        }))
      )
      if (allItems.length > 0) {
        await tx.recordItem.createMany({ data: allItems })
      }

      return createdRecords
    })

    // 응답용 매장 정보는 이미 조회한 코스 멤버의 매장으로 채운다 (기존: 생성 후 다시 조회)
    const storeById = new Map(
      membersToCreate.map((member) => [
        member.storeId,
        { id: member.store.id, name: member.store.name, address: member.store.address },
      ])
    )
    const workRecords = createdRecords.map((record) => ({
      ...record,
      store: record.storeId ? storeById.get(record.storeId) ?? null : null,
    }))

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
