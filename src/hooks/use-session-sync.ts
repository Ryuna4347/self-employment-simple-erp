"use client"

import { useEffect } from "react"
import { signOut } from "next-auth/react"

const CHANNEL_NAME = "auth-session-sync"

export function useSessionSync() {
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return

    const channel = new BroadcastChannel(CHANNEL_NAME)

    channel.onmessage = (event) => {
      if (event.data.type === "SIGN_OUT") {
        signOut({ callbackUrl: "/" })
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
