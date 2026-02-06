"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchableDropdownProps<T> {
  /** 검색어 */
  searchTerm: string
  /** 검색어 변경 핸들러 */
  onSearchChange: (term: string) => void
  /** 드롭다운 표시 여부 */
  showDropdown: boolean
  /** 포커스 핸들러 */
  onFocus: () => void
  /** 블러 핸들러 */
  onBlur: () => void
  /** 드롭다운에 표시할 아이템 목록 */
  items: T[]
  /** 아이템 키 추출 함수 */
  getItemKey: (item: T) => string
  /** 아이템 렌더링 함수 */
  renderItem: (item: T) => React.ReactNode
  /** 아이템 선택 핸들러 */
  onItemSelect: (item: T) => void
  /** placeholder 텍스트 */
  placeholder?: string
  /** 검색 결과 없을 때 메시지 */
  emptyMessage?: string
  /** Input ID */
  id?: string
  /** 비활성화 여부 */
  disabled?: boolean
}

/**
 * 검색 가능한 드롭다운 컴포넌트
 * - 검색 Input + 드롭다운 목록
 * - 제네릭 타입으로 다양한 아이템 타입 지원
 */
export function SearchableDropdown<T>({
  searchTerm,
  onSearchChange,
  showDropdown,
  onFocus,
  onBlur,
  items,
  getItemKey,
  renderItem,
  onItemSelect,
  placeholder = "검색...",
  emptyMessage = "검색 결과가 없습니다",
  id,
  disabled = false,
}: SearchableDropdownProps<T>) {
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          id={id}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          className="pl-9"
          disabled={disabled}
        />
      </div>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {items.length > 0 ? (
            items.map((item) => (
              <button
                key={getItemKey(item)}
                type="button"
                onMouseDown={() => onItemSelect(item)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
              >
                {renderItem(item)}
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
