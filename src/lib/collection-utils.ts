import { format } from "date-fns"
import { toKSTLocal } from "@/lib/date-utils"
import { CARRYOVER_ITEM_PREFIX } from "@/lib/sales-utils"
import type { PrismaClient } from "@/generated/prisma/client"

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/**
 * 일반 사용자(비 ADMIN)가 근무기록을 직접 수금처리할 수 있는 기한.
 * max(createdAt, date) 기준 2일(48시간). 기한이 지나면 수금 확인 요청만 가능.
 */
export const DIRECT_COLLECT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000

/**
 * 이월 수금 통합 처리
 * - 날짜 ASC 정렬
 * - 마지막 건 제외 모든 RecordItem.amount → 0 (salesAmount는 유지)
 * - 마지막 건에 "이월 수금" 항목 추가 (누적 금액, salesAmount = 0)
 * - 전체 COLLECTED 처리
 */
export async function consolidateAndCollect(
  tx: TransactionClient,
  workRecordIds: string[],
  collectedByUserId: string,
  collectedAt: Date,
) {
  // 1. 대상 레코드 조회 (합계 계산에 필요한 필드만)
  const records = await tx.workRecord.findMany({
    where: { id: { in: workRecordIds } },
    select: {
      id: true,
      date: true,
      collectionStatus: true,
      items: { select: { amount: true } },
    },
  })

  // UNCOLLECTED만 필터 + 날짜 ASC 정렬
  const sortedRecords = records
    .filter((r) => r.collectionStatus === "UNCOLLECTED")
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sortedRecords.length === 0) {
    return { updatedCount: 0, accumulatedAmount: 0 }
  }

  const lastRecord = sortedRecords[sortedRecords.length - 1]

  // 2. 마지막 건 제외 레코드의 합계를 모아 이월 수금 항목을 만든다 (날짜 ASC 순서)
  //    쓰기는 레코드마다 하지 않고 아래에서 한 번씩만 실행한다 (트랜잭션 왕복·잠금 시간 단축)
  const recordsToZero = sortedRecords.slice(0, -1)
  let accumulatedAmount = 0
  const carryoverItems: {
    workRecordId: string
    name: string
    amount: number
    quantity: number
    salesAmount: number
  }[] = []

  for (const record of recordsToZero) {
    const recordTotal = record.items.reduce((sum, item) => sum + item.amount, 0)
    accumulatedAmount += recordTotal

    // 마지막 건에 날짜 포함된 이월 수금 항목 추가
    if (recordTotal > 0) {
      carryoverItems.push({
        workRecordId: lastRecord.id,
        name: `${CARRYOVER_ITEM_PREFIX}${format(toKSTLocal(record.date), "yyyy-MM-dd")})`,
        amount: recordTotal,
        quantity: 1,
        // 이월분은 새 매출이 아니라 이전 방문 매출의 이동이므로 매출 원금은 0
        salesAmount: 0,
      })
    }
  }

  // 3. 마지막 건 제외 모든 레코드의 RecordItem.amount → 0 (salesAmount는 유지)
  if (recordsToZero.length > 0) {
    await tx.recordItem.updateMany({
      where: { workRecordId: { in: recordsToZero.map((r) => r.id) } },
      data: { amount: 0 },
    })
  }

  // 이월 수금 항목 일괄 생성 (배열 순서대로 생성되어 품목 순서(id ASC)도 날짜 ASC를 유지)
  if (carryoverItems.length > 0) {
    await tx.recordItem.createMany({ data: carryoverItems })
  }

  // 4. 전체 COLLECTED 처리
  const allRecordIds = sortedRecords.map((r) => r.id)
  await tx.workRecord.updateMany({
    where: { id: { in: allRecordIds } },
    data: {
      collectionStatus: "COLLECTED",
      collectedAt,
      collectedByUserId,
    },
  })

  return {
    updatedCount: allRecordIds.length,
    accumulatedAmount,
  }
}
