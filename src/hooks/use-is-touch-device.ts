"use client"

import { useSyncExternalStore } from "react"

// 주 입력 장치가 터치(손가락)인 기기 — 휴대폰/태블릿
// 화면 너비 기준(useIsMobile)과 달리 "지도 앱을 열 수 있는 기기인지" 판별용
const MEDIA_QUERY = "(pointer: coarse)"

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mql = window.matchMedia(MEDIA_QUERY)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(MEDIA_QUERY).matches
}

function getServerSnapshot(): boolean {
  return false
}

export function useIsTouchDevice(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
