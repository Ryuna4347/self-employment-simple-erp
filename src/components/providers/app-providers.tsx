"use client";

import { createContext, useContext, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/sonner";
import { createQueryClient } from "@/lib/query-client";
import type { Role } from "@/generated/prisma/client";

// 현재 로그인한 사용자 정보 Context
interface UserContextValue {
  id: string;
  name: string;
  loginId: string;
  role: Role;
}

const UserContext = createContext<UserContextValue | null>(null);

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser는 AppProviders 내에서 사용해야 합니다");
  return ctx;
}

interface AppProvidersProps {
  children: React.ReactNode;
  user?: UserContextValue;
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
export function AppProviders({ children, user }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {user ? (
        <UserContext.Provider value={user}>{children}</UserContext.Provider>
      ) : (
        children
      )}
      <Toaster />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
