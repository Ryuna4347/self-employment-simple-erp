/**
 * 매출 원금(salesAmount) 유틸리티
 *
 * RecordItem에는 두 가지 금액이 있다.
 * - amount      : 현재 잔액(수금 장부). 수금 처리 시 0, 이월 수금 시 마지막 건으로 이동한다.
 * - salesAmount : 매출 원금. 등록 시점 금액을 고정 보관하며 수금 처리로 변하지 않는다.
 *
 * 매출 추이/비교 집계는 salesAmount를, 미수금/수금액 집계는 amount를 사용한다.
 */

/**
 * salesAmount 집계 기준일 (KST, "YYYY-MM-DD")
 *
 * 과거 데이터는 백필하지 않으므로 이 날짜 이전 근무기록은 salesAmount가 0이다.
 * 대시보드는 기준일 이전 기록을 amount(기존 방식)로, 이후 기록을 salesAmount로 집계한다.
 * 컬럼 마이그레이션 + 배포가 완료된 날짜로 맞춰야 한다.
 */
export const SALES_AMOUNT_CUTOVER_DATE = "2026-09-03"

/** 이월 수금 항목 이름 접두사. consolidateAndCollect가 생성하는 `이월 수금 (YYYY-MM-DD)` 형식 */
export const CARRYOVER_ITEM_PREFIX = "이월 수금 ("

/** 이월 수금 항목 여부. 이 항목은 새 매출이 아니라 이전 방문 매출의 이동분이다 */
export function isCarryoverItemName(name: string): boolean {
  return name.startsWith(CARRYOVER_ITEM_PREFIX)
}

interface RecordItemInput {
  name: string
  amount: number
  quantity: number
}

/**
 * 품목 입력값 → RecordItem 저장 데이터
 *
 * 일반 품목은 salesAmount = amount, 이월 수금 항목은 salesAmount = 0으로 저장한다.
 * (어드민이 이월 항목이 포함된 기록을 수정 저장해도 매출이 중복 집계되지 않도록 가드)
 */
export function toRecordItemData(item: RecordItemInput) {
  return {
    name: item.name,
    amount: item.amount,
    quantity: item.quantity,
    salesAmount: isCarryoverItemName(item.name) ? 0 : item.amount,
  }
}
