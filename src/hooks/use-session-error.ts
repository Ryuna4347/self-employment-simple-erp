"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useRef } from "react"

type SessionError = "SessionExpired" | "RefreshTokenInvalid" | "TokenReused" | "UserDeleted"

export function useSessionError() {
  const { data: session, status } = useSession()
  const isHandlingRef = useRef(false)  // Strict Mode 이중 실행 방지

  useEffect(() => {
    // 로딩 중이거나 이미 처리 중이면 스킵
    if (status === "loading" || isHandlingRef.current) return

    const error = (session as { error?: SessionError } | null)?.error
    if (!error) return

    isHandlingRef.current = true

    // 에러 메시지와 함께 리다이렉트 (인라인 에러 패턴 활용)
    const errorParam = error === "SessionExpired"
      ? "sessionExpired=true"
      : "authError=true"

    signOut({ callbackUrl: `/?${errorParam}` })

    return () => {
      isHandlingRef.current = false
    }
  }, [session, status])
}
