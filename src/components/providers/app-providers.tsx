"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "@/lib/query-client";

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * 앱 전역 Provider 조합
 *
 * **Provider 구성**:
 * - QueryClientProvider - react-query (401 전역 처리 포함)
 *
 * **세션 처리**:
 * - 서버 컴포넌트(layout.tsx)에서 auth() 호출하여 처리
 * - 세션 에러 시 서버에서 로그인 페이지로 redirect
 *
 * **QueryClient 인스턴스 관리**:
 * - useState로 생성하여 SSR 시 클라이언트 간 공유 방지
 */
export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
