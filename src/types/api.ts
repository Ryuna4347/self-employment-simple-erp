/**
 * API 공통 응답 타입
 *
 * 모든 API 라우트는 apiSuccess() (src/lib/api-response.ts)가 만드는
 * `{ data: T, message? }` 구조로 응답한다. 각 훅에서 래퍼 인터페이스를
 * 재정의하지 않고 이 타입을 공용으로 사용한다.
 */
export interface ApiResponse<T> {
  data: T
  message?: string
}

/**
 * 페이지네이션 정보 (서버 라우트 공통 shape)
 *
 * 페이로드 필드명(records/stores/templates/requests/items)은 라우트마다
 * 다르므로 `ApiResponse<{ stores: Store[]; pagination: PaginationInfo }>`
 * 처럼 합성해서 사용한다.
 */
export interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
