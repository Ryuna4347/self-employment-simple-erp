import type { PaymentType } from "@/generated/prisma/client"

// 주차 그룹: 1주차 (1st, 3rd, 5th 출현) vs 2주차 (2nd, 4th 출현)
export type WeekGroup = 1 | 2

// 요일 (월~금), date-fns getDay: 1=Mon, 5=Fri
export type Weekday = 1 | 2 | 3 | 4 | 5

// 요일 한국어 라벨
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: "월요일",
  2: "화요일",
  3: "수요일",
  4: "목요일",
  5: "금요일",
}

// 매장별 집계 데이터 (시트 내 한 행)
export interface StoreAggregation {
  storeName: string
  shortAddress: string // "시/구" 추출
  paymentType: PaymentType
  totalAmount: number // SUM(unitPrice * quantity) across aggregated weeks
}

// 직원별 매장 목록 (시트 내 직원 블록)
export interface EmployeeBlock {
  employeeName: string
  stores: StoreAggregation[]
  subtotal: number
}

// 시트 데이터
export interface SheetData {
  sheetName: string // e.g., "월요일 1주차"
  employeeBlocks: EmployeeBlock[]
  sheetTotal: number
}

// 월간 합계 시트 데이터
export interface MonthlySummaryData {
  expenseTotal: number
  revenueTotal: number
  netProfit: number
}
