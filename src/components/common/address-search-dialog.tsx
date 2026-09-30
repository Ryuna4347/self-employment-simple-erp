"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { getSelectedAddress, loadPostcode } from "@/lib/postcode"

interface AddressSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 열 때 바로 검색할 검색어 (기존 주소 등) */
  initialQuery?: string
  /** 검색 결과 선택 시 (저장용 주소 문자열) */
  onSelect: (address: string) => void
}

/**
 * 주소 검색 다이얼로그 (Kakao 우편번호 서비스 임베드)
 * - 모바일: 풀스크린 / 데스크톱: 다이얼로그
 * - 팝업(window.open) 대신 embed 사용 → 모바일/웹뷰에서도 동작
 */
export function AddressSearchDialog({
  open,
  onOpenChange,
  initialQuery,
  onSelect,
}: AddressSearchDialogProps) {
  const handleComplete = (address: string) => {
    onSelect(address)
    onOpenChange(false)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-lg flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>주소 검색</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            도로명, 건물명, 지번으로 검색한 뒤 결과를 선택하세요
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <PostcodeEmbed initialQuery={initialQuery} onComplete={handleComplete} />
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

function PostcodeEmbed({
  initialQuery,
  onComplete,
}: {
  initialQuery?: string
  onComplete: (address: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasError, setHasError] = useState(false)
  // 재시도 시 임베드를 다시 실행하기 위한 값
  const [attempt, setAttempt] = useState(0)

  // 최신 콜백 참조 (콜백이 바뀔 때마다 임베드를 다시 만들지 않도록)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false

    loadPostcode()
      .then((Postcode) => {
        if (cancelled) return
        new Postcode({
          oncomplete: (data) => onCompleteRef.current(getSelectedAddress(data)),
          width: "100%",
          height: "100%",
          hideMapBtn: true,
          hideEngBtn: true,
        }).embed(container, { q: initialQuery?.trim() || undefined })
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })

    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [initialQuery, attempt])

  const handleRetry = () => {
    setHasError(false)
    setAttempt((v) => v + 1)
  }

  return (
    <div className="relative flex-1 min-h-[400px] sm:h-[480px] sm:flex-none mx-4 mb-4 sm:mx-0 sm:mb-0 overflow-hidden rounded-md border border-gray-200">
      {/* 로딩 표시: 임베드(iframe)가 그려지면 그 아래로 가려짐 */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
        <Loader2 className="size-6 animate-spin" />
      </div>

      <div ref={containerRef} className="absolute inset-0" />

      {hasError && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white px-6 text-center">
          <p className="text-sm text-gray-700">주소 검색을 불러오지 못했습니다</p>
          <p className="text-xs text-gray-500">
            네트워크 상태를 확인해 주세요. 닫은 뒤 주소를 직접 입력할 수도 있습니다.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
            다시 시도
          </Button>
        </div>
      )}
    </div>
  )
}
