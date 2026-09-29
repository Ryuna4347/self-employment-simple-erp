"use client"

import { useSyncExternalStore } from "react"
import { isAddressAction, type AddressAction } from "@/lib/map-links"

/**
 * 주소 탭 동작 "선택 기억하기" 값 (기기별 localStorage 저장, DB 저장 안 함)
 * - null: 저장 안 됨 → 매번 선택 시트 표시
 */
const STORAGE_KEY = "address-action-preference"
// 같은 탭 내 변경 알림용 (storage 이벤트는 다른 탭에서만 발생)
const CHANGE_EVENT = "address-action-preference-change"

export function getAddressActionPreference(): AddressAction | null {
  if (typeof window === "undefined") return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return isAddressAction(value) ? value : null
  } catch {
    return null
  }
}

/** 저장(null이면 해제). 저장소 접근 실패 시 false */
export function setAddressActionPreference(action: AddressAction | null): boolean {
  try {
    if (action) {
      window.localStorage.setItem(STORAGE_KEY, action)
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    return false
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
  return true
}

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const handleStorage = (e: StorageEvent) => {
    // key === null: 저장소 전체 clear
    if (e.key === null || e.key === STORAGE_KEY) callback()
  }
  window.addEventListener("storage", handleStorage)
  window.addEventListener(CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener("storage", handleStorage)
    window.removeEventListener(CHANGE_EVENT, callback)
  }
}

function getServerSnapshot(): AddressAction | null {
  return null
}

export function useAddressActionPreference(): AddressAction | null {
  return useSyncExternalStore(subscribe, getAddressActionPreference, getServerSnapshot)
}
