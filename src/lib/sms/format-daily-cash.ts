import type { EmployeeCashSummary } from "@/lib/reports/daily-cash-collection"

function formatAmount(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`
}

export function formatDailyCashBody(input: {
  dateLabel: string
  rows: EmployeeCashSummary[]
  grandTotal: number
}): string {
  const { dateLabel, rows, grandTotal } = input

  if (rows.length === 0) {
    return `[수금알림] ${dateLabel} 어제 현금 수금 내역이 없습니다.`
  }

  const visibleRows = rows.slice(0, 50)
  const hiddenCount = rows.length - visibleRows.length
  const lines = [
    `[수금알림] ${dateLabel} 어제 현금 수금`,
    ...visibleRows.map(
      (row) => `${row.name} ${formatAmount(row.totalAmount)} (${row.recordCount}건)`
    ),
  ]

  if (hiddenCount > 0) {
    lines.push(`외 ${hiddenCount}명`)
  }

  lines.push(`합계 ${formatAmount(grandTotal)}`)

  return lines.join("\n")
}
