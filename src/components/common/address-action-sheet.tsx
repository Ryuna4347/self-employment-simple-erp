"use client"

import { useId, useState } from "react"
import { Copy, MapIcon, type LucideIcon } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  ADDRESS_ACTIONS,
  ADDRESS_ACTION_LABELS,
  DESKTOP_ADDRESS_ACTIONS,
  type AddressAction,
} from "@/lib/map-links"

// 선택지별 표시 정보
const ACTION_DISPLAY: Record<AddressAction, { description: string; icon: LucideIcon; iconClassName: string }> = {
  kakao: {
    description: "카카오맵 앱에서 주소 검색",
    icon: MapIcon,
    iconClassName: "bg-[#FEE500] text-gray-900",
  },
  naver: {
    description: "네이버지도 앱에서 주소 검색",
    icon: MapIcon,
    iconClassName: "bg-[#03C75A] text-white",
  },
  copy: {
    description: "다른 앱에 붙여넣을 수 있도록 복사",
    icon: Copy,
    iconClassName: "bg-gray-100 text-gray-700",
  },
}

// [임시] 데스크톱은 지도 앱 대신 웹 지도(새 탭)로 열리므로 설명만 바꾼다
const DESKTOP_DESCRIPTION: Partial<Record<AddressAction, string>> = {
  naver: "네이버지도 웹에서 주소 검색 (새 탭)",
}

interface AddressActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address: string
  /** 시트를 열 때마다 바뀌는 값 — "선택 기억하기" 체크 상태 초기화용 */
  sessionKey: number
  /** 데스크톱(터치 아님) 여부 — 선택지를 네이버지도(웹)/주소 복사로 제한 */
  isDesktop: boolean
  onSelect: (action: AddressAction, remember: boolean) => void
}

/**
 * 주소 탭 동작 선택 시트 (모바일: 바텀시트, 태블릿 이상: 다이얼로그)
 * - 터치 기기: 카카오맵 / 네이버지도 / 주소 복사
 * - 데스크톱: 네이버지도(웹) / 주소 복사
 * - "선택 기억하기" 체크 시 이 기기에 저장되어 다음부터 바로 실행
 */
export function AddressActionSheet({
  open,
  onOpenChange,
  address,
  sessionKey,
  isDesktop,
  onSelect,
}: AddressActionSheetProps) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-sm">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>주소 열기</ResponsiveModalTitle>
          <ResponsiveModalDescription className="break-keep">{address}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <AddressActionOptions
          key={sessionKey}
          isDesktop={isDesktop}
          onSelect={onSelect}
        />

        <ResponsiveModalFooter className="pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

function AddressActionOptions({
  isDesktop,
  onSelect,
}: {
  isDesktop: boolean
  onSelect: (action: AddressAction, remember: boolean) => void
}) {
  const [remember, setRemember] = useState(false)
  const rememberId = useId()
  const actions = isDesktop ? DESKTOP_ADDRESS_ACTIONS : ADDRESS_ACTIONS

  return (
    <div className="px-4 sm:px-0 space-y-3">
      <div className="space-y-2">
        {actions.map((action) => {
          const { icon: Icon, iconClassName } = ACTION_DISPLAY[action]
          const description =
            (isDesktop ? DESKTOP_DESCRIPTION[action] : undefined) ?? ACTION_DISPLAY[action].description
          return (
            <button
              key={action}
              type="button"
              onClick={() => onSelect(action, remember)}
              className="w-full flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
            >
              <span
                className={cn(
                  "size-9 rounded-full flex items-center justify-center flex-shrink-0",
                  iconClassName,
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">
                  {ADDRESS_ACTION_LABELS[action]}
                </span>
                <span className="block text-xs text-gray-500">{description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* 선택 기억하기 */}
      <div className="flex items-start gap-2 px-1">
        <Checkbox
          id={rememberId}
          checked={remember}
          onCheckedChange={(checked) => setRemember(checked === true)}
          className="mt-0.5"
        />
        <label htmlFor={rememberId} className="text-sm text-gray-700 select-none">
          선택 기억하기
          <span className="block text-xs text-gray-500 mt-0.5">
            다음부터 주소를 누르면 바로 실행됩니다. 내 정보에서 변경할 수 있어요.
          </span>
        </label>
      </div>
    </div>
  )
}
