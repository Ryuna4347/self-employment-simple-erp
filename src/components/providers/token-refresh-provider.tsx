"use client";

import { useEffect, useRef } from "react";
import { updateTokenExpiry } from "@/lib/token-refresh-mutex";

interface TokenRefreshProviderProps {
  children: React.ReactNode;
  initialTokenExpiry?: number;
}

/**
 * 토큰 갱신 Provider
 *
 * **기능**:
 * - 서버에서 받은 초기 토큰 만료 시간으로 상태 초기화
 *
 * **핵심 해결책은 api-client.ts의 ensureValidToken()**:
 * - 모든 API 요청 전 토큰 유효성 확인
 * - 갱신 중이면 기존 Promise 대기 (뮤텍스)
 * - 여러 요청이 동시에 발생해도 토큰 갱신은 1번만 수행
 */
export function TokenRefreshProvider({
  children,
  initialTokenExpiry,
}: TokenRefreshProviderProps) {
  const initialized = useRef(false);

  // 초기 토큰 만료 시간 설정
  useEffect(() => {
    if (!initialized.current && initialTokenExpiry) {
      updateTokenExpiry(initialTokenExpiry);
      initialized.current = true;
    }
  }, [initialTokenExpiry]);

  return <>{children}</>;
}
