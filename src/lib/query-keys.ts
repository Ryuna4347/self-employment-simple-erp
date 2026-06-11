/**
 * TanStack Query 키 중앙 레지스트리
 *
 * 같은 키 리터럴이 여러 훅에 재정의되며 생기던 invalidate 불일치를 막는다.
 * 규칙:
 * - 키 리터럴 값은 기존 훅들이 쓰던 값을 그대로 보존한다 (캐시 등가성).
 *   계층이 비일관해 보여도(1단 vs ["admin", ...] 2단) 값을 바꾸면
 *   무효화 범위가 달라지므로 이름으로만 정리한다.
 * - 파라미터가 붙는 키는 각 훅에서 `[...queryKeys.xxx, params]`로 합성한다.
 */
export const queryKeys = {
  // ── 근무기록 ──────────────────────────────────────────────
  workRecords: ["work-records"] as const,
  // workRecords의 prefix 하위 키 — workRecords 무효화 시 함께 무효화되는 것이 의도
  dailyCashCollection: ["work-records", "daily-cash-collection"] as const,
  storeVisits: ["store-visits"] as const,
  storeUncollected: ["store-uncollected"] as const,
  dailyCost: ["daily-cost"] as const,

  // ── 매장/코스 ─────────────────────────────────────────────
  stores: ["stores"] as const,
  storeTemplates: ["store-templates"] as const,

  // ── 수금 ─────────────────────────────────────────────────
  collectionRequests: ["collection-requests"] as const,
  collectionHistory: ["collection-history"] as const,

  // ── 기타 ─────────────────────────────────────────────────
  users: ["users"] as const,
  latestNotice: ["notices", "latest"] as const,

  // ── 관리자 ────────────────────────────────────────────────
  // 광범위 무효화 전용 (매장 정보 수정 → 스냅샷 연동 화면 일괄 갱신).
  // 좁히면 미수금/대시보드의 스냅샷 갱신이 누락되므로 그대로 둘 것.
  adminScope: ["admin"] as const,
  dashboard: ["admin", "dashboard"] as const,
  costs: ["admin", "costs"] as const,
  recurringCosts: ["admin", "recurring-costs"] as const,
  staff: ["admin", "staff"] as const,
  outstanding: ["admin", "outstanding"] as const,
  adminNotices: ["admin", "notices"] as const,
} as const
