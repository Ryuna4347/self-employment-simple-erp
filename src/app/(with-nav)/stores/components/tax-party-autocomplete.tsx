"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { apiClient } from "@/lib/api-client"
import { cn, formatBizNo } from "@/lib/utils"

export interface TaxPartyOption {
  id: string
  name: string
  bizNo: string
}

interface TaxPartyAutocompleteProps {
  value?: TaxPartyOption | null
  onChange: (party: TaxPartyOption | null) => void
  disabled?: boolean
}

interface TaxPartySearchResponse {
  data: {
    parties: TaxPartyOption[]
  }
}

export function TaxPartyAutocomplete({
  value,
  onChange,
  disabled,
}: TaxPartyAutocompleteProps) {
  const [inputValue, setInputValue] = useState("")
  const [options, setOptions] = useState<TaxPartyOption[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const displayValue = value ? `${value.name} (${formatBizNo(value.bizNo)})` : inputValue

  useEffect(() => {
    if (value) {
      setInputValue("")
    }
  }, [value])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [])

  useEffect(() => {
    if (value || inputValue.trim() === "") {
      setOptions([])
      setHasSearched(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient<TaxPartySearchResponse>(
          `/api/tax-parties/search?q=${encodeURIComponent(inputValue.trim())}`
        )
        setOptions(response.data.parties)
        setHasSearched(true)
      } catch {
        setOptions([])
        setHasSearched(true)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [inputValue, value])

  const handleInputChange = (nextValue: string) => {
    if (value) {
      onChange(null)
    }
    setInputValue(nextValue)
    setIsOpen(true)
  }

  const handleSelect = (party: TaxPartyOption) => {
    onChange(party)
    setInputValue("")
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange(null)
    setInputValue("")
    setOptions([])
    setHasSearched(false)
    setIsOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={displayValue}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          placeholder="사업자명 또는 사업자번호 검색"
          className="pl-9 pr-10"
          autoComplete="off"
        />
        {value && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2"
            aria-label="사업자 연결 해제"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {isOpen && !disabled && !value && inputValue.trim() !== "" && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-background shadow-md">
          {isLoading && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              검색 중...
            </div>
          )}

          {!isLoading && options.length > 0 && (
            <div className="py-1">
              {options.map((party) => (
                <button
                  key={party.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(party)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground",
                    "focus:bg-accent focus:text-accent-foreground focus:outline-none"
                  )}
                >
                  {party.name} ({formatBizNo(party.bizNo)})
                </button>
              ))}
            </div>
          )}

          {!isLoading && hasSearched && options.length === 0 && (
            <div className="px-3 py-3 text-sm text-muted-foreground">
              검색 결과 없음. 어드민 페이지에서 등록 필요
            </div>
          )}
        </div>
      )}
    </div>
  )
}
