/**
 * 공통 API 클라이언트
 *
 * **목적**: 모든 API 요청에 대한 일관된 에러 처리
 * - 401 응답 시 ApiError 발생 → react-query에서 전역 처리
 * - JSON 응답 자동 파싱
 */

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
 * @throws {ApiError} HTTP 에러 응답 시
 */
export async function apiClient<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
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
