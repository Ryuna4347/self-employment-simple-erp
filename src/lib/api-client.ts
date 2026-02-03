/**
 * 공통 API 클라이언트
 *
 * **목적**: 모든 API 요청에 대한 일관된 에러 처리
 * - 요청 전 토큰 유효성 확인 (ensureValidToken)
 * - 401 응답 시 ApiError 발생 → react-query에서 전역 처리
 * - JSON 응답 자동 파싱
 */

import { ensureValidToken } from "./token-refresh-mutex";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface FetchOptions extends RequestInit {
  /**
   * JSON body를 자동으로 stringify
   */
  json?: unknown;
}

/**
 * fetch wrapper with error handling
 *
 * @throws {ApiError} HTTP 에러 응답 시 (토큰 갱신 실패 포함)
 */
export async function apiClient<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  // 요청 전 토큰 유효성 확인 (필요 시 갱신)
  const tokenValid = await ensureValidToken();
  if (!tokenValid) {
    throw new ApiError("세션이 만료되었습니다", 401);
  }

  const { json, ...fetchOptions } = options;

  // JSON body 자동 처리
  if (json !== undefined) {
    fetchOptions.body = JSON.stringify(json);
    fetchOptions.headers = {
      "Content-Type": "application/json",
      ...fetchOptions.headers,
    };
  }

  const response = await fetch(url, fetchOptions);

  // 응답 본문 파싱
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.error?.message || `HTTP ${response.status}`,
      response.status,
      data
    );
  }

  return data as T;
}
