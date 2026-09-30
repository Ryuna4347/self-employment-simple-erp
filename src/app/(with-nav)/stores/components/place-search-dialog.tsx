"use client"

import { useState } from "react"
import { Loader2, MapPin, Search } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDebounce } from "@/hooks/use-debounce"
import { ApiError } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import {
  PLACE_SEARCH_MIN_LENGTH,
  usePlaceSearch,
  type PlaceSearchResult,
} from "../hooks/use-place-search"

interface PlaceSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 열 때 검색창에 채울 값 (입력돼 있던 매장명) */
  initialQuery?: string
  /** 수정 중인 매장 ID ('이미 등록됨' 표시에서 제외) */
  excludeStoreId?: string
  onSelect: (place: PlaceSearchResult) => void
}

/**
 * 매장 검색 다이얼로그 (상호 → Kakao 장소)
 * - 모바일: 풀스크린 / 데스크톱: 다이얼로그
 * - 선택하면 매장명(비어 있을 때)·주소·장소 연결 정보를 채운다
 */
export function PlaceSearchDialog({
  open,
  onOpenChange,
  initialQuery,
  excludeStoreId,
  onSelect,
}: PlaceSearchDialogProps) {
  const handleSelect = (place: PlaceSearchResult) => {
    onSelect(place)
    onOpenChange(false)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-lg flex flex-col sm:max-h-[80vh]">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>매장 검색</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            카카오맵에 등록된 매장을 상호로 찾아요. 지역을 함께 적으면 더 정확해요.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        {/* 다이얼로그가 닫히면 언마운트 → 열 때마다 검색어가 initialQuery로 초기화됨 */}
        <PlaceSearchBody
          initialQuery={initialQuery ?? ""}
          excludeStoreId={excludeStoreId}
          onSelect={handleSelect}
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

function PlaceSearchBody({
  initialQuery,
  excludeStoreId,
  onSelect,
}: {
  initialQuery: string
  excludeStoreId?: string
  onSelect: (place: PlaceSearchResult) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const debouncedQuery = useDebounce(query.trim(), 300)
  const { data: places, isFetching, error, refetch } = usePlaceSearch(debouncedQuery, excludeStoreId)

  const isTooShort = debouncedQuery.length < PLACE_SEARCH_MIN_LENGTH
  // 입력 중(디바운스 대기) 또는 요청 중
  const isPending = !isTooShort && (isFetching || query.trim() !== debouncedQuery)

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-3 px-4 pb-4 sm:px-0 sm:pb-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          autoFocus
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 명동교자 명동, 스타벅스 강남역점"
          aria-label="매장 검색어"
          className="pl-9"
        />
      </div>

      <div className="flex-1 min-h-[240px] overflow-y-auto -mx-1 px-1">
        {isTooShort ? (
          <p className="py-10 text-center text-sm text-gray-500">
            상호를 {PLACE_SEARCH_MIN_LENGTH}글자 이상 입력해주세요
          </p>
        ) : error ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-gray-700">
              {error instanceof ApiError ? error.message : "매장 검색 중 오류가 발생했습니다"}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              다시 시도
            </Button>
          </div>
        ) : isPending && !places ? (
          <div className="py-10 flex justify-center text-gray-400">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : places && places.length === 0 ? (
          <div className="py-10 text-center space-y-1">
            <p className="text-sm text-gray-700">검색 결과가 없어요</p>
            <p className="text-xs text-gray-500">
              카카오맵에 등록되지 않은 매장은 &lsquo;주소 검색&rsquo;으로 주소를 입력해주세요
            </p>
          </div>
        ) : (
          <ul className={cn("space-y-2 transition-opacity", isPending && "opacity-60")}>
            {places?.map((place) => (
              <li key={place.id}>
                <PlaceItem place={place} onSelect={onSelect} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function PlaceItem({
  place,
  onSelect,
}: {
  place: PlaceSearchResult
  onSelect: (place: PlaceSearchResult) => void
}) {
  const address = place.roadAddress || place.jibunAddress
  const isRegistered = !!place.registeredStore
  // 카테고리는 마지막 두 단계만 (예: "음식점 > 한식 > 냉면" → "한식 > 냉면")
  const category = place.category.split(">").map((s) => s.trim()).filter(Boolean).slice(-2).join(" > ")

  return (
    <button
      type="button"
      disabled={isRegistered}
      onClick={() => onSelect(place)}
      className="w-full text-left rounded-lg border border-gray-200 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:bg-gray-50 disabled:hover:bg-gray-50"
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={cn("font-medium text-sm truncate", isRegistered ? "text-gray-500" : "text-gray-900")}>
          {place.name}
        </span>
        {category && <span className="text-xs text-gray-400 truncate shrink-0 max-w-[45%]">{category}</span>}
      </div>
      {address && (
        <p className="mt-1 flex items-start gap-1 text-xs text-gray-600">
          <MapPin className="size-3.5 flex-shrink-0 mt-px" />
          <span>{address}</span>
        </p>
      )}
      {place.roadAddress && place.jibunAddress && (
        <p className="mt-0.5 pl-[18px] text-xs text-gray-400">지번 {place.jibunAddress}</p>
      )}
      {isRegistered && (
        <p className="mt-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
          이미 등록된 매장 · {place.registeredStore?.name}
        </p>
      )}
    </button>
  )
}
