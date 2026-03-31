"use client"

import { useEffect } from "react"
import { clearTokenExpiry } from "@/lib/token-expiry"

const CHANNEL_NAME = "auth-session-sync"

export function useSessionSync() {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return

    const channel = new BroadcastChannel(CHANNEL_NAME)

    channel.onmessage = (event) => {
      if (event.data.type === "SIGN_OUT") {
        clearTokenExpiry()
        window.location.href = "/"
      }
    }

    return () => channel.close()
  }, [])
}

// 로그아웃 시 다른 탭에 알림
export function broadcastSignOut() {
  if (typeof BroadcastChannel === "undefined") return
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type: "SIGN_OUT" })
  channel.close()
}

/**
 * 로그아웃 처리 (API 호출 + 쿠키 삭제 + 리다이렉트)
 */
export async function performSignOut() {
  broadcastSignOut()
  clearTokenExpiry()

  try {
    await fetch("/api/auth/logout", { method: "POST" })
  } catch {
    // 실패해도 리다이렉트
  }

  window.location.href = "/"
}
