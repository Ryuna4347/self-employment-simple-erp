"use client"

/**
 * 공통 API 클라이언트
 *
 * **토큰 갱신 전략**:
 * 1. 요청 전: accessToken 만료 10분 이내면 사전 갱신
 * 2. 403 응답 시: 자동 갱신 후 원래 요청 재시도 (1회)
 * 3. 갱신 실패 시: 401과 동일하게 처리 (로그인 리다이렉트)
 *
 * **동시 다발 갱신 방지**: 진행 중인 refresh Promise 재사용
 */

import { isTokenExpiringSoon, setTokenExpiry } from "./token-expiry"

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
  /** JSON body를 자동으로 stringify */
  json?: unknown;
}

// 동시 다발 갱신 방지를 위한 진행 중인 Promise
let refreshPromise: Promise<boolean> | null = null

/**
 * refreshToken으로 accessToken 갱신
 * @returns 갱신 성공 여부
 */
async function refreshAccessToken(): Promise<boolean> {
  // 이미 진행 중인 갱신이 있으면 재사용
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" })
      if (!res.ok) return false

      const data = await res.json()
      if (data?.data?.expiresAt) {
        setTokenExpiry(data.data.expiresAt)
      }
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

/**
 * fetch wrapper with error handling & token refresh
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

  // 요청 전: 만료 임박하면 사전 갱신
  if (isTokenExpiringSoon()) {
    await refreshAccessToken()
  }

  let response = await fetch(url, fetchOptions);

  // 403 응답 시: 토큰 갱신 후 재시도 (1회)
  if (response.status === 403) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await fetch(url, fetchOptions)
    }
  }

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
