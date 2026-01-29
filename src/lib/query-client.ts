"use client";

import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { ApiError } from "./api-client";

/**
 * QueryClient 생성 함수
 *
 * **401 전역 처리**:
 * - QueryCache.onError에서 401 에러 감지
 * - 로그인 페이지로 리다이렉트 (세션 만료 표시)
 *
 * **세션 처리 방식**:
 * - 서버 컴포넌트에서 세션 유효성 검사 (layout.tsx)
 * - 클라이언트에서 API 호출 시 401 발생하면 페이지 리다이렉트
 *
 * **참고**: 컴포넌트 외부에서 생성하면 SSR 시 클라이언트 간 공유 문제 발생
 * → 반드시 useState 또는 useRef로 인스턴스 관리 필요
 */
export function createQueryClient(): QueryClient {
  const handle401 = () => {
    // 클라이언트에서 401 발생 시 로그인 페이지로 이동
    if (typeof window !== "undefined") {
      window.location.href = "/?sessionExpired=true";
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          handle401();
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          handle401();
        }
      },
    }),
    defaultOptions: {
      queries: {
        // 세션 체크 실패 시 불필요한 재시도 방지
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status === 401) {
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
