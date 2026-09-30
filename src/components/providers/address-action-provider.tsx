"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { toast } from "sonner"
import { AddressActionSheet } from "@/components/common/address-action-sheet"
import { useIsTouchDevice } from "@/hooks/use-is-touch-device"
import {
  getAddressActionPreference,
  setAddressActionPreference,
} from "@/hooks/use-address-action-preference"
import {
  ADDRESS_ACTION_LABELS,
  DESKTOP_ADDRESS_SHEET_ENABLED,
  copyAddressToClipboard,
  getMapWebUrl,
  openMapApp,
  openMapWeb,
  type AddressAction,
} from "@/lib/map-links"

interface AddressActionContextValue {
  /**
   * 주소 탭 처리
   * - 기억된 선택이 있으면 바로 실행, 없으면 선택 시트 표시
   * - 데스크톱(터치 아님): [임시] 지도는 네이버지도 웹(새 탭)으로 연결.
   *   DESKTOP_ADDRESS_SHEET_ENABLED가 false면 즉시 복사 (기존 동작)
   */
  handleAddress: (address: string) => void
  /** 터치 기기 여부 (지도 앱 연동 대상) */
  isTouchDevice: boolean
}

const AddressActionContext = createContext<AddressActionContextValue | null>(null)

export function useAddressAction(): AddressActionContextValue {
  const ctx = useContext(AddressActionContext)
  if (!ctx) throw new Error("useAddressAction은 AddressActionProvider 내에서 사용해야 합니다")
  return ctx
}

async function copyWithToast(address: string, description?: string) {
  const copied = await copyAddressToClipboard(address)
  if (copied) {
    toast.success("주소가 복사되었습니다", description ? { description } : undefined)
  } else {
    toast.error("주소를 복사하지 못했습니다")
  }
}

function runAddressAction(action: AddressAction, address: string, isTouchDevice: boolean) {
  if (action === "copy") {
    void copyWithToast(address)
    return
  }

  // [임시] 데스크톱은 지도 앱이 없으므로, 어떤 지도를 골랐든(설정에 카카오맵이 저장된 경우 포함)
  // 네이버지도 웹을 새 탭으로 연다. 클릭 핸들러 안에서 동기 호출되므로 팝업 차단에 걸리지 않는다
  if (!isTouchDevice) {
    openMapWeb(getMapWebUrl("naver", address))
    return
  }

  const label = ADDRESS_ACTION_LABELS[action]
  openMapApp(action, address, {
    // iOS에서 앱이 열리지 않은 경우 (미설치 등) → 웹 지도 또는 설치 페이지 안내
    onAppNotOpened: (fallback) => {
      toast(`${label} 앱이 열리지 않았나요?`, {
        description:
          fallback.type === "web"
            ? "앱이 설치되어 있지 않다면 웹 지도로 볼 수 있습니다"
            : "앱이 설치되어 있지 않다면 App Store에서 설치할 수 있습니다",
        duration: 6000,
        action: {
          label: fallback.type === "web" ? "웹에서 열기" : "앱 설치하기",
          onClick: () => openMapWeb(fallback.url),
        },
      })
    },
  })
}

// 시트 요청 (sessionKey: 열 때마다 증가 → 시트 내부 체크 상태 초기화)
interface SheetRequest {
  address: string
  sessionKey: number
}

/**
 * 주소 탭 동작 Provider
 *
 * 선택 시트를 카드마다 두지 않고 전역 1개로 관리한다.
 * (카드 내부에 두면 포털 이벤트가 React 트리를 따라 카드의 확장 토글/드래그 핸들러로 전파됨)
 */
export function AddressActionProvider({ children }: { children: React.ReactNode }) {
  const isTouchDevice = useIsTouchDevice()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [request, setRequest] = useState<SheetRequest>({ address: "", sessionKey: 0 })

  const handleAddress = useCallback(
    (address: string) => {
      const trimmed = address.trim()
      if (!trimmed) return

      if (!isTouchDevice && !DESKTOP_ADDRESS_SHEET_ENABLED) {
        void copyWithToast(trimmed)
        return
      }

      // 탭 시점에 최신 값을 직접 읽는다 (다른 탭/설정 화면 변경 반영)
      const preference = getAddressActionPreference()
      if (preference) {
        runAddressAction(preference, trimmed, isTouchDevice)
        return
      }

      setRequest((prev) => ({ address: trimmed, sessionKey: prev.sessionKey + 1 }))
      setSheetOpen(true)
    },
    [isTouchDevice],
  )

  const handleSelect = (action: AddressAction, remember: boolean) => {
    setSheetOpen(false)
    const address = request.address

    if (remember) {
      const saved = setAddressActionPreference(action)
      if (!saved) {
        toast.error("선택을 저장하지 못했습니다")
      } else if (action === "copy") {
        // 복사는 결과 토스트에 안내를 합쳐 1개만 표시
        void copyWithToast(address, "다음부터 주소를 누르면 바로 복사됩니다. 내 정보에서 변경할 수 있어요.")
        return
      } else {
        toast.success("선택을 기억했습니다", {
          description: `다음부터 ${ADDRESS_ACTION_LABELS[action]}(으)로 바로 열립니다. 내 정보에서 변경할 수 있어요.`,
        })
      }
    }

    runAddressAction(action, address, isTouchDevice)
  }

  const contextValue = useMemo(
    () => ({ handleAddress, isTouchDevice }),
    [handleAddress, isTouchDevice],
  )

  return (
    <AddressActionContext.Provider value={contextValue}>
      {children}
      <AddressActionSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        address={request.address}
        sessionKey={request.sessionKey}
        isDesktop={!isTouchDevice}
        onSelect={handleSelect}
      />
    </AddressActionContext.Provider>
  )
}
