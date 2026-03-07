import type { PaymentType } from "@/generated/prisma/client"

// 일별 통계 타입
export interface DailySummary {
  totalVisits: number
  totalSales: number
  collectedSales: number
  uncollectedSales: number
  collectedByPaymentType: Record<PaymentType, number>
  pendingCollectionSales: number
  pendingCollectionByPaymentType: Record<PaymentType, number>
}
