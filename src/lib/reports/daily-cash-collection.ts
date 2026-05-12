import { prisma } from "@/lib/prisma"
import { dateToKSTEndOfDay, dateToKSTMidnight } from "@/lib/date-utils"

export interface EmployeeCashSummary {
  userId: string
  name: string
  totalAmount: number
  recordCount: number
  pendingAmount: number
  pendingCount: number
}

export interface DailyCashCollectionResult {
  isoDate: string
  dateLabel: string
  rows: EmployeeCashSummary[]
  grandTotal: number
}

function formatDateLabel(dateStr: string): string {
  const [month, day] = dateStr
    .split("-")
    .slice(1)
    .map((value) => Number(value))

  return `${month}/${day}`
}

export async function getCashCollectionByEmployee(
  targetKstDateStr: string
): Promise<DailyCashCollectionResult> {
  const startDate = dateToKSTMidnight(targetKstDateStr)
  const endDate = dateToKSTEndOfDay(targetKstDateStr)

  const [collectedRecords, pendingRequests] = await Promise.all([
    prisma.workRecord.findMany({
      where: {
        collectionStatus: "COLLECTED",
        paymentTypeSnapshot: "CASH",
        date: { gte: startDate, lte: endDate },
      },
      select: {
        userId: true,
        items: { select: { amount: true } },
      },
    }),
    prisma.collectionRequest.findMany({
      where: {
        status: "PENDING",
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        items: {
          select: {
            workRecord: {
              select: {
                userId: true,
                paymentTypeSnapshot: true,
                collectionStatus: true,
                items: { select: { amount: true } },
              },
            },
          },
        },
      },
    }),
  ])

  type Bucket = {
    collected: number
    collectedCount: number
    pending: number
    pendingCount: number
  }
  const map = new Map<string, Bucket>()
  const getBucket = (userId: string): Bucket => {
    const existing = map.get(userId)
    if (existing) return existing
    const fresh: Bucket = { collected: 0, collectedCount: 0, pending: 0, pendingCount: 0 }
    map.set(userId, fresh)
    return fresh
  }

  for (const record of collectedRecords) {
    const sum = record.items.reduce((acc, item) => acc + item.amount, 0)
    const bucket = getBucket(record.userId)
    bucket.collected += sum
    bucket.collectedCount += 1
  }

  for (const request of pendingRequests) {
    for (const item of request.items) {
      const wr = item.workRecord
      if (wr.paymentTypeSnapshot !== "CASH") continue
      if (wr.collectionStatus !== "UNCOLLECTED") continue
      const sum = wr.items.reduce((acc, i) => acc + i.amount, 0)
      const bucket = getBucket(wr.userId)
      bucket.pending += sum
      bucket.pendingCount += 1
    }
  }

  const userIds = [...map.keys()]
  const users =
    userIds.length === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
  const nameById = new Map(users.map((user) => [user.id, user.name]))

  const rows = userIds
    .map((userId) => {
      const bucket = map.get(userId)!
      return {
        userId,
        name: nameById.get(userId) ?? userId,
        totalAmount: bucket.collected,
        recordCount: bucket.collectedCount,
        pendingAmount: bucket.pending,
        pendingCount: bucket.pendingCount,
      }
    })
    .sort((a, b) => {
      const aDisplay = a.totalAmount + a.pendingAmount
      const bDisplay = b.totalAmount + b.pendingAmount
      if (bDisplay !== aDisplay) return bDisplay - aDisplay
      return a.name.localeCompare(b.name, "ko")
    })

  const grandTotal = rows.reduce((acc, row) => acc + row.totalAmount, 0)

  return {
    isoDate: targetKstDateStr,
    dateLabel: formatDateLabel(targetKstDateStr),
    rows,
    grandTotal,
  }
}

