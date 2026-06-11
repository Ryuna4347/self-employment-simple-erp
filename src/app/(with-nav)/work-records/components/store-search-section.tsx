"use client"

import { useMemo } from "react"
import { MapPin } from "lucide-react"
import { Label } from "@/components/ui/label"
import { SearchableDropdown } from "@/components/common"
import type { useDropdownState } from "@/hooks/use-dropdown-state"
import type { Store } from "@/app/(with-nav)/stores/hooks/use-stores"

interface StoreSearchSectionProps {
  /** 부모가 소유한 드롭다운 상태 (선택 시 검색어 세팅 등 부모 핸들러와 공유) */
  dropdown: ReturnType<typeof useDropdownState>
  stores: Store[]
  error?: string
  onSelect: (store: Store) => void
}

/**
 * 근무기록 추가 모달의 매장 검색 섹션
 * 선택 시 폼 자동 채움(handleStoreSelect)은 폼 전체에 닿는 로직이라 부모에 유지한다.
 */
export function StoreSearchSection({
  dropdown,
  stores,
  error,
  onSelect,
}: StoreSearchSectionProps) {
  // 매장 검색 필터링 (매장명/주소, 최대 10개)
  const filteredStores = useMemo(() => {
    if (!dropdown.searchTerm) return stores.slice(0, 10)
    return stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(dropdown.searchTerm.toLowerCase()) ||
          store.address.toLowerCase().includes(dropdown.searchTerm.toLowerCase())
      )
      .slice(0, 10)
  }, [stores, dropdown.searchTerm])

  return (
    <div className="space-y-2">
      <Label htmlFor="storeSearch">
        매장 선택 <span className="text-red-500">*</span>
      </Label>
      <SearchableDropdown
        id="storeSearch"
        searchTerm={dropdown.searchTerm}
        onSearchChange={dropdown.handleSearchChange}
        showDropdown={dropdown.showDropdown}
        onFocus={() => dropdown.setShowDropdown(true)}
        onBlur={dropdown.handleBlur}
        items={filteredStores}
        getItemKey={(store) => store.id}
        renderItem={(store) => (
          <>
            <p className="text-sm font-medium text-gray-900">{store.name}</p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="size-3" />
              {store.address}
            </p>
          </>
        )}
        onItemSelect={onSelect}
        placeholder="기존 매장을 검색하여 자동 입력..."
        emptyMessage="검색 결과가 없습니다"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
