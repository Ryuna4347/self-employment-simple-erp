"use client"

import { useState, useMemo, useCallback } from "react"
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll"
import { Loader2, Search, Users } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUsers } from "@/hooks/use-users"
import { RefreshFab } from "@/components/common/refresh-fab"
import { useCollectionHistory } from "../hooks/use-collections"
import { CollectionHistoryCard } from "./collection-history-card"

// 연도 옵션 (2024 ~ 현재)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export function CollectionHistoryTab() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedUserId, setSelectedUserId] = useState("all")
  const [storeName, setStoreName] = useState("")
  const [searchStoreName, setSearchStoreName] = useState("")

  const { data: users } = useUsers()

  const params = useMemo(
    () => ({
      year,
      month,
      userId: selectedUserId !== "all" ? selectedUserId : undefined,
      search: searchStoreName || undefined,
    }),
    [year, month, selectedUserId, searchStoreName]
  )

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCollectionHistory(params)

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  )

  // 무한 스크롤
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage })

  const handleSearch = useCallback(() => {
    setSearchStoreName(storeName.trim())
  }, [storeName])

  const yearOptions = getYearOptions()

  return (
    <div>
      {/* 직원 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="size-4 text-gray-500" />
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 연도/월 필터 */}
      <div className="flex items-center gap-2 mb-4">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[100px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}년
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
          <SelectTrigger className="w-[90px]" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_OPTIONS.map((m) => (
              <SelectItem key={m} value={String(m)}>
                {m}월
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 매장명 검색 */}
      <div className="flex gap-1.5 mb-4">
        <Input
          className="h-8 text-sm"
          placeholder="매장명 검색"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
          }}
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 목록 */}
      {!isLoading && (
        <div className="space-y-3">
          {items.length > 0 ? (
            items.map((item, i) => (
              <CollectionHistoryCard key={`${item.type}-${item.collectedAt}-${i}`} item={item} />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              수금 이력이 없습니다
            </div>
          )}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  )
}
