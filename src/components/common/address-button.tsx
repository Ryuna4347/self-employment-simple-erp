"use client"

import { MapPin } from "lucide-react"
import { useAddressAction } from "@/components/providers/address-action-provider"
import { DESKTOP_ADDRESS_SHEET_ENABLED } from "@/lib/map-links"
import { cn } from "@/lib/utils"

interface AddressButtonProps {
  /** 주소 (빈 문자열이면 "주소 없음" 표시, 탭해도 동작 없음) */
  address: string
  className?: string
}

/**
 * 카드용 주소 버튼
 * - 모바일(터치): 지도 앱 선택 시트 / 기억된 앱으로 바로 이동
 * - 데스크톱: [임시] 선택 시트(네이버지도 웹 / 주소 복사). DESKTOP_ADDRESS_SHEET_ENABLED가 false면 주소 복사
 * - 카드 확장 토글로 이벤트가 전파되지 않도록 click/keydown 전파 차단
 */
export function AddressButton({ address, className }: AddressButtonProps) {
  const { handleAddress, isTouchDevice } = useAddressAction()
  const displayAddress = address || "주소 없음"
  const actionLabel = isTouchDevice || DESKTOP_ADDRESS_SHEET_ENABLED ? "지도 열기" : "주소 복사"

  return (
    <button
      type="button"
      aria-label={`${actionLabel}: ${displayAddress}`}
      className={cn(
        "flex items-start gap-1.5 text-sm text-gray-600 active:bg-gray-100 rounded",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation()
        if (address) handleAddress(address)
      }}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <MapPin className="size-4 flex-shrink-0 mt-0.5" />
      <span className="line-clamp-1">{displayAddress}</span>
    </button>
  )
}
