"use client"

import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  setAddressActionPreference,
  useAddressActionPreference,
} from "@/hooks/use-address-action-preference"
import { ADDRESS_ACTIONS, ADDRESS_ACTION_LABELS, isAddressAction } from "@/lib/map-links"

// 저장값 없음(매번 선택)을 나타내는 Select 값
const ASK_EVERY_TIME = "ask"

/**
 * 주소 탭 동작 설정 (기기별 localStorage 저장, DB 저장 안 함)
 * - 주소 선택 시트에서 "선택 기억하기"로 저장한 값을 변경/해제
 */
export function AddressActionSetting() {
  const preference = useAddressActionPreference()

  const handleChange = (value: string) => {
    const next = isAddressAction(value) ? value : null
    if (!setAddressActionPreference(next)) {
      toast.error("설정을 저장하지 못했습니다")
      return
    }
    toast.success(
      next
        ? `주소를 누르면 ${ADDRESS_ACTION_LABELS[next]}${next === "copy" ? "가 바로 실행됩니다" : "(으)로 바로 열립니다"}`
        : "주소를 누를 때마다 선택합니다",
    )
  }

  return (
    <div className="px-4 py-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor="address-action-setting" className="text-sm text-gray-500">
          주소 탭 동작
        </label>
        <p className="text-xs text-gray-400 mt-0.5">
          매장·근무기록 주소를 눌렀을 때 (PC는 지도를 네이버지도 웹으로 열기)
        </p>
      </div>
      <Select value={preference ?? ASK_EVERY_TIME} onValueChange={handleChange}>
        <SelectTrigger id="address-action-setting" size="sm" className="w-32 shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ASK_EVERY_TIME}>매번 선택</SelectItem>
          {ADDRESS_ACTIONS.map((action) => (
            <SelectItem key={action} value={action}>
              {ADDRESS_ACTION_LABELS[action]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
