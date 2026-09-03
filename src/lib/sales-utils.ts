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
 *
 * 기준일 이후 날짜인데 구버전 코드로 생성된 기록(배포 전 등록분)은 salesAmount가 0이므로,
 * 배포 직후 백필(salesAmount = amount, amount > 0인 일반 품목만)을 한 번 실행해 채운다.
 * 2026-09-03: 컬럼 마이그레이션 적용 + 코드 배포 + 백필 실행.
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

/** RecordItem 생성 데이터 (salesAmount 포함) */
export interface RecordItemData extends RecordItemInput {
  salesAmount: number
}

/** 기존에 저장된 RecordItem 중 매출 원금 보존에 필요한 필드 */
export interface ExistingRecordItem {
  name: string
  amount: number
  salesAmount: number
}

/**
 * 품목 입력값 → RecordItem 저장 데이터
 *
 * 일반 품목은 salesAmount = amount, 이월 수금 항목은 salesAmount = 0으로 저장한다.
 * (어드민이 이월 항목이 포함된 기록을 수정 저장해도 매출이 중복 집계되지 않도록 가드)
 */
export function toRecordItemData(item: RecordItemInput): RecordItemData {
  return {
    name: item.name,
    amount: item.amount,
    quantity: item.quantity,
    salesAmount: isCarryoverItemName(item.name) ? 0 : item.amount,
  }
}

/**
 * 품목 재생성 시 기존 매출 원금 보존
 *
 * 근무기록 수정(PUT)은 기존 품목을 전부 삭제 후 재생성한다. 이때 toRecordItemData만 쓰면
 * 수금 처리로 amount가 0/이월 이동된 기록을 어드민이 메모·사진만 고쳐도 salesAmount가 0으로
 * 덮어써져 해당 방문의 매출이 대시보드에서 사라진다.
 *
 * 1단계 (품목 단위): 새 품목을 "품목명이 같고 amount가 동일한" 기존 품목과 매칭한다 (동일 품목명이 여러 개면 순서대로 소진).
 * - 매칭됨 → amount가 바뀌지 않았으므로 매출 사실도 그대로. 기존 salesAmount 유지
 * - 매칭 안 됨 (신규 품목 또는 어드민이 금액을 고친 품목) → toRecordItemData (salesAmount = 새 amount)
 *
 * 2단계 (기록 단위): 현장 관행상 최상위 품목 1개에 기록 전체 합계 금액을 적고, 나머지 품목은 0원(자재 기록용)으로
 * 두는 경우가 대부분이다 (항상은 아니며 품목별로 금액을 적는 기록도 있다). 이 구조에서 수금 처리로 amount가 모두
 * 0이 된 뒤 어드민이 최상위 품목을 이름 변경/삭제하면 1단계 매칭이 실패해 기록의 매출 원금이 통째로 사라진다.
 * 그래서 기록의 amount 합계가 바뀌지 않았다면(= 재가격이 아니다) 매출 원금 합계도 유지되어야 한다고 보고,
 * 1단계 후 빠진 금액을 최상위(첫 번째) 일반 품목에 더한다. 품목별로 금액을 적은 기록은 1단계에서 각자 매칭되므로
 * 2단계는 개입하지 않는다. amount 합계가 바뀐 경우(재가격)는 새 금액을 그대로 매출 원금으로 본다.
 */
export function toRecordItemDataPreservingSales(
  items: RecordItemInput[],
  existingItems: ExistingRecordItem[],
): RecordItemData[] {
  // 품목명별 기존 품목 큐
  const pool = new Map<string, ExistingRecordItem[]>()
  for (const existing of existingItems) {
    const queue = pool.get(existing.name)
    if (queue) queue.push(existing)
    else pool.set(existing.name, [existing])
  }

  // 1단계: 품목 단위 매칭
  const result = items.map((item) => {
    const queue = pool.get(item.name)
    const matchIndex = queue ? queue.findIndex((existing) => existing.amount === item.amount) : -1
    if (queue && matchIndex !== -1) {
      const [prev] = queue.splice(matchIndex, 1)
      return {
        name: item.name,
        amount: item.amount,
        quantity: item.quantity,
        salesAmount: prev.salesAmount,
      }
    }
    return toRecordItemData(item)
  })

  // 2단계: 기록 단위 합계 보존 (amount 합계가 그대로일 때만)
  if (existingItems.length === 0) return result
  const existingAmountTotal = existingItems.reduce((acc, e) => acc + e.amount, 0)
  const newAmountTotal = items.reduce((acc, i) => acc + i.amount, 0)
  if (newAmountTotal !== existingAmountTotal) return result

  const existingSalesTotal = existingItems.reduce((acc, e) => acc + e.salesAmount, 0)
  const assignedSalesTotal = result.reduce((acc, r) => acc + r.salesAmount, 0)
  const missing = existingSalesTotal - assignedSalesTotal
  if (missing > 0) {
    // 최상위 품목에 합계를 적는 관행에 따라 첫 번째 일반 품목이 승계. 이월 수금 항목은 매출 원금 0을 유지해야 하므로 제외
    const top = result.find((r) => !isCarryoverItemName(r.name)) ?? result[0]
    if (top) top.salesAmount += missing
  }
  return result
}
