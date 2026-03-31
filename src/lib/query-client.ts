"use client";

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "./api-client";

/**
 * QueryClient 생성 함수
 *
 * **401 전역 처리**:
 * - QueryCache.onError에서 401 에러 감지
 * - 로그인 페이지로 리다이렉트 (세션 만료 표시)
 *
 * **403 처리**:
 * - api-client에서 자동 갱신 + 재시도를 수행
 * - 갱신 실패 시 403이 그대로 올라오면 401과 동일하게 처리
 *
 * **전역 에러 토스트**:
 * - MutationCache.onError에서 401/403 외 에러 시 toast.error 표시
 */
export function createQueryClient(): QueryClient {
  const handleAuthError = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/?sessionExpired=true";
    }
  };

  const isAuthError = (error: unknown) =>
    error instanceof ApiError && (error.status === 401 || error.status === 403);

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isAuthError(error)) {
          handleAuthError();
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isAuthError(error)) {
          handleAuthError();
          return;
        }
        // 인증 에러 외 모든 mutation 에러에 대해 토스트 표시
        toast.error(
          error instanceof ApiError ? error.message : "오류가 발생했습니다"
        );
      },
    }),
    defaultOptions: {
      queries: {
        // 인증 에러 시 불필요한 재시도 방지
        retry: (failureCount, error) => {
          if (isAuthError(error)) {
            return false;
          }
          return failureCount < 3;
        },
        // 포커스 시 자동 refetch 비활성화 (토큰 갱신 race condition 방지)
        refetchOnWindowFocus: false,
        // 오래된 데이터 기준 (5분)
        staleTime: 5 * 60 * 1000,
      },
    },
  });
}
