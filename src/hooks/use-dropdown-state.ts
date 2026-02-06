"use client"

import { useState, useRef, useCallback, useMemo } from "react"

/**
 * 드롭다운 검색 상태 관리 Hook
 * - 검색어, 드롭다운 표시 상태, blur 처리를 일관되게 관리
 */
export function useDropdownState(initialSearchTerm = "") {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm)
  const [showDropdown, setShowDropdown] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // blur 시 약간의 딜레이 후 드롭다운 숨김 (클릭 이벤트 처리 위해)
  const handleBlur = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setShowDropdown(false)
    }, 200)
  }, [])

  // 검색어 변경 시 드롭다운 표시
  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value)
    setShowDropdown(true)
  }, [])

  // 초기화
  const reset = useCallback((newSearchTerm = "") => {
    setSearchTerm(newSearchTerm)
    setShowDropdown(false)
  }, [])

  return useMemo(() => ({
    searchTerm,
    setSearchTerm,
    showDropdown,
    setShowDropdown,
    handleBlur,
    handleSearchChange,
    reset,
  }), [searchTerm, showDropdown, handleBlur, handleSearchChange, reset])
}

/**
 * 인덱스 기반 드롭다운 상태 관리 Hook (useFieldArray와 함께 사용)
 * - 배열 필드의 각 항목별로 독립적인 드롭다운 상태 관리
 */
export function useIndexedDropdownState() {
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({})
  const [showDropdowns, setShowDropdowns] = useState<Record<number, boolean>>({})
  const timeoutRefs = useRef<Record<number, NodeJS.Timeout>>({})

  const getSearchTerm = useCallback((index: number) => {
    return searchTerms[index] ?? ""
  }, [searchTerms])

  const setSearchTerm = useCallback((index: number, value: string) => {
    setSearchTerms((prev) => ({ ...prev, [index]: value }))
  }, [])

  const isDropdownOpen = useCallback((index: number) => {
    return showDropdowns[index] ?? false
  }, [showDropdowns])

  const openDropdown = useCallback((index: number) => {
    setShowDropdowns((prev) => ({ ...prev, [index]: true }))
  }, [])

  const closeDropdown = useCallback((index: number) => {
    setShowDropdowns((prev) => ({ ...prev, [index]: false }))
  }, [])

  const handleBlur = useCallback((index: number) => {
    if (timeoutRefs.current[index]) {
      clearTimeout(timeoutRefs.current[index])
    }
    timeoutRefs.current[index] = setTimeout(() => {
      closeDropdown(index)
    }, 200)
  }, [closeDropdown])

  const handleSearchChange = useCallback((index: number, value: string) => {
    setSearchTerm(index, value)
    openDropdown(index)
  }, [setSearchTerm, openDropdown])

  // 항목 삭제 시 인덱스 재정렬
  const reindexAfterRemove = useCallback((removedIndex: number) => {
    setSearchTerms((prev) => {
      const newTerms: Record<number, string> = {}
      Object.keys(prev).forEach((key) => {
        const keyNum = parseInt(key)
        if (keyNum < removedIndex) {
          newTerms[keyNum] = prev[keyNum]
        } else if (keyNum > removedIndex) {
          newTerms[keyNum - 1] = prev[keyNum]
        }
      })
      return newTerms
    })
    setShowDropdowns((prev) => {
      const newDropdowns: Record<number, boolean> = {}
      Object.keys(prev).forEach((key) => {
        const keyNum = parseInt(key)
        if (keyNum < removedIndex) {
          newDropdowns[keyNum] = prev[keyNum]
        } else if (keyNum > removedIndex) {
          newDropdowns[keyNum - 1] = prev[keyNum]
        }
      })
      return newDropdowns
    })
  }, [])

  // 초기화
  const reset = useCallback((initialTerms: Record<number, string> = {}) => {
    setSearchTerms(initialTerms)
    setShowDropdowns({})
  }, [])

  return useMemo(() => ({
    getSearchTerm,
    setSearchTerm,
    isDropdownOpen,
    openDropdown,
    closeDropdown,
    handleBlur,
    handleSearchChange,
    reindexAfterRemove,
    reset,
  }), [getSearchTerm, setSearchTerm, isDropdownOpen, openDropdown, closeDropdown, handleBlur, handleSearchChange, reindexAfterRemove, reset])
}
