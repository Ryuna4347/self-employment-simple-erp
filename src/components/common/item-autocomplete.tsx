"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SaleItem } from "@/app/(with-nav)/sale-items/hooks/use-sale-items"

interface ItemAutocompleteProps {
  /** 검색어 */
  searchTerm: string
  /** 검색어 변경 핸들러 */
  onSearchChange: (value: string) => void
  /** 드롭다운 표시 여부 */
  showDropdown: boolean
  /** 포커스 핸들러 */
  onFocus: () => void
  /** 블러 핸들러 */
  onBlur: () => void
  /** 자동완성 후보 목록 */
  items: SaleItem[]
  /** 아이템 선택 핸들러 */
  onItemSelect: (item: SaleItem) => void
  /** 에러 메시지 */
  error?: string
  /** placeholder 텍스트 */
  placeholder?: string
  /** 라벨 텍스트 */
  label?: string
  /** 최대 표시 개수 */
  maxItems?: number
}

/**
 * 품목 자동완성 입력 컴포넌트
 * - SaleItem 기반 자동완성
 * - 품명 검색 + 단가 자동 입력
 */
export function ItemAutocomplete({
  searchTerm,
  onSearchChange,
  showDropdown,
  onFocus,
  onBlur,
  items,
  onItemSelect,
  error,
  placeholder = "품목 검색...",
  label = "품명",
  maxItems = 5,
}: ItemAutocompleteProps) {
  // 검색어로 필터링
  const filteredItems = items
    .filter((item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(0, maxItems)

  const showResults = showDropdown && searchTerm.length > 0

  return (
    <div className="relative">
      {label && <Label className="text-xs text-gray-600">{label}</Label>}
      <Input
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={label ? "mt-1" : ""}
        aria-invalid={!!error}
      />

      {/* 자동완성 드롭다운 */}
      {showResults && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => onItemSelect(item)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
              >
                <p className="text-sm text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.unitPrice.toLocaleString()}원
                </p>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-gray-400">
              검색 결과가 없습니다
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
