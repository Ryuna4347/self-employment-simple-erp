import { format } from "date-fns"
import type { PrismaClient } from "@/generated/prisma/client"

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0]

/**
 * 이월 수금 통합 처리
 * - 날짜 ASC 정렬
 * - 마지막 건 제외 모든 RecordItem.amount → 0
 * - 마지막 건에 "이월 수금" 항목 추가 (누적 금액)
 * - 전체 COLLECTED 처리
 */
export async function consolidateAndCollect(
  tx: TransactionClient,
  workRecordIds: string[],
  collectedByUserId: string,
  collectedAt: Date,
) {
  // 1. 대상 레코드 조회 (items 포함)
  const records = await tx.workRecord.findMany({
    where: { id: { in: workRecordIds } },
    include: { items: true },
  })

  // UNCOLLECTED만 필터 + 날짜 ASC 정렬
  const sortedRecords = records
    .filter((r) => r.collectionStatus === "UNCOLLECTED")
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (sortedRecords.length === 0) {
    return { updatedCount: 0, accumulatedAmount: 0 }
  }

  const lastRecord = sortedRecords[sortedRecords.length - 1]

  // 2. 마지막 건 제외 모든 레코드의 RecordItem.amount → 0
  const recordsToZero = sortedRecords.slice(0, -1)
  let accumulatedAmount = 0

  for (const record of recordsToZero) {
    const recordTotal = record.items.reduce((sum, item) => sum + item.amount, 0)
    accumulatedAmount += recordTotal

    await tx.recordItem.updateMany({
      where: { workRecordId: record.id },
      data: { amount: 0 },
    })

    // 마지막 건에 날짜 포함된 이월 수금 항목 추가
    if (recordTotal > 0) {
      await tx.recordItem.create({
        data: {
          workRecordId: lastRecord.id,
          name: `이월 수금 (${format(record.date, "yyyy-MM-dd")})`,
          amount: recordTotal,
          quantity: 1,
        },
      })
    }
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
