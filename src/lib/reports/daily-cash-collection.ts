import { prisma } from "@/lib/prisma"
import {
  dateToKSTEndOfDay,
  dateToKSTMidnight,
  toKSTDateString,
} from "@/lib/date-utils"

export interface EmployeeCashSummary {
  userId: string
  name: string
  totalAmount: number
  recordCount: number
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

  const records = await prisma.workRecord.findMany({
    where: {
      collectionStatus: "COLLECTED",
      paymentTypeSnapshot: "CASH",
      date: { gte: startDate, lte: endDate },
    },
    select: {
      userId: true,
      items: { select: { amount: true, quantity: true } },
    },
  })

  const map = new Map<string, { total: number; count: number }>()
  for (const record of records) {
    const sum = record.items.reduce((acc, item) => acc + item.amount, 0)
    const current = map.get(record.userId) ?? { total: 0, count: 0 }
    map.set(record.userId, {
      total: current.total + sum,
      count: current.count + 1,
    })
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
      const summary = map.get(userId)
      return {
        userId,
        name: nameById.get(userId) ?? userId,
        totalAmount: summary?.total ?? 0,
        recordCount: summary?.count ?? 0,
      }
    })
    .sort((a, b) => {
      if (b.totalAmount !== a.totalAmount) return b.totalAmount - a.totalAmount
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

export async function getYesterdayCashCollectionByEmployee(
  now: Date = new Date()
): Promise<DailyCashCollectionResult> {
  const todayStr = toKSTDateString(now)
  const yesterdayStr = toKSTDateString(
    new Date(dateToKSTMidnight(todayStr).getTime() - 24 * 60 * 60 * 1000)
  )

  return getCashCollectionByEmployee(yesterdayStr)
}
