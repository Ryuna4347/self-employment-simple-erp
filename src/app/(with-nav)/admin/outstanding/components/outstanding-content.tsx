"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, Search } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { CollectionStatus } from "@/app/(with-nav)/work-records/hooks/use-work-records"
import {
  useOutstanding,
  useToggleCollection,
  useBatchToggleCollection,
  type OutstandingParams,
} from "../hooks/use-outstanding"
import { OutstandingCard } from "./outstanding-card"
import { StoreOutstandingCard } from "./store-outstanding-card"
import type { StoreGroup } from "./store-outstanding-card"

type ViewMode = "date" | "store"

// 연도 옵션 생성 (2024 ~ 현재 연도)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}

// 월 옵션 (1~12)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * 미수금 관리 메인 컨텐츠
 *
 * 날짜별/매장별 필터를 전환하며 미수금 목록을 표시한다.
 * 날짜별: 연/월 Select, 레코드 단위 페이지네이션
 * 매장별: 매장명 검색 텍스트필드, 매장 단위 페이지네이션
 */
export function OutstandingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const now = new Date()

  // URL에서 초기값 읽기
  const initialYear = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : now.getFullYear()
  const initialMonth = searchParams.get("month")
    ? Number(searchParams.get("month"))
    : now.getMonth() + 1
  const initialView = (searchParams.get("view") as ViewMode) || "date"
  const initialStoreName = searchParams.get("storeName") ?? ""
  const initialPage = Number(searchParams.get("page") ?? 1)

  const [year, setYear] = useState(initialYear)
  const [month, setMonth] = useState(initialMonth)
  const [view, setView] = useState<ViewMode>(initialView)
  const [storeName, setStoreName] = useState(initialStoreName)
  const [searchStoreName, setSearchStoreName] = useState(initialStoreName)
  const [page, setPage] = useState(initialPage)

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams()
    params.set("view", view)
    if (view === "date") {
      params.set("year", String(year))
      params.set("month", String(month))
    } else {
      if (searchStoreName) params.set("storeName", searchStoreName)
    }
    if (page > 1) params.set("page", String(page))
    router.replace(`/admin/outstanding?${params.toString()}`)
  }, [year, month, view, searchStoreName, page, router])

  // 낙관적 업데이트용 토글 상태 맵
  const [toggledItems, setToggledItems] = useState<Map<string, CollectionStatus>>(new Map())

  // 낙관적 요약 보정 (페이지 간 누적)
  const [toggleAdjustments, setToggleAdjustments] = useState({
    amountDelta: 0,
    countDelta: 0,
  })

  // 필터 파라미터 변경 시 토글 상태 + 페이지 초기화
  useEffect(() => {
    setToggledItems(new Map())
    setToggleAdjustments({ amountDelta: 0, countDelta: 0 })
    setPage(1)
  }, [year, month, view, searchStoreName])

  // 쿼리 파라미터 구성
  const queryParams: OutstandingParams = useMemo(() => {
    if (view === "date") {
      return { filter: "date", year, month, page }
    }
    return {
      filter: "store",
      ...(searchStoreName ? { storeName: searchStoreName } : {}),
      page,
    }
  }, [view, year, month, searchStoreName, page])

  // 데이터 조회
  const { data, isLoading, isError } = useOutstanding(queryParams)
  const toggleMutation = useToggleCollection()
  const batchMutation = useBatchToggleCollection()

  // 토글 상태가 반영된 레코드 목록
  const displayRecords = useMemo(() => {
    if (!data?.records) return []
    return data.records.map((record) => ({
      ...record,
      collectionStatus: toggledItems.has(record.id)
        ? toggledItems.get(record.id)!
        : record.collectionStatus,
    }))
  }, [data, toggledItems])

  // 동적 요약 (서버 summary + 낙관적 보정)
  const dynamicSummary = useMemo(() => {
    if (!data) return { totalOutstanding: 0, count: 0 }
    return {
      totalOutstanding: data.summary.totalOutstanding + toggleAdjustments.amountDelta,
      count: data.summary.count + toggleAdjustments.countDelta,
    }
  }, [data, toggleAdjustments])

  // 매장별 그룹핑 (store 모드에서만 사용)
  const storeGroups = useMemo((): StoreGroup[] => {
    if (view !== "store" || !displayRecords.length) return []

    const groupMap = new Map<string, StoreGroup>()

    for (const record of displayRecords) {
      const key = record.storeNameSnapshot ?? "-"

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          storeName: key,
          storeAddress: record.storeAddressSnapshot,
          paymentType: record.paymentTypeSnapshot,
          managerName: record.managerNameSnapshot,
          records: [],
          totalAmount: 0,
        })
      }

      const group = groupMap.get(key)!
      group.records.push({
        id: record.id,
        date: record.date,
        totalAmount: record.totalAmount,
        collectionStatus: record.collectionStatus,
      })
    }

    // 미수금 합계 계산
    for (const group of groupMap.values()) {
      group.totalAmount = group.records
        .filter((r) => r.collectionStatus === "UNCOLLECTED")
        .reduce((sum, r) => sum + r.totalAmount, 0)
    }

    // 미수금 합계 내림차순 정렬
    return Array.from(groupMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount
    )
  }, [view, displayRecords])

  // 토글 중인 레코드 ID
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // 일괄 수금 처리 중인 매장명
  const [batchTogglingStore, setBatchTogglingStore] = useState<string | null>(null)

  // 수금 상태 토글 핸들러 (낙관적 업데이트)
  const handleToggle = useCallback(
    (id: string, newCollectionStatus: CollectionStatus) => {
      setTogglingId(id)

      // 낙관적 업데이트
      setToggledItems((prev) => new Map(prev).set(id, newCollectionStatus))

      // 요약 보정: 수금 완료 → 금액/건수 감소, 미수 처리 → 증가
      const record = data?.records.find((r) => r.id === id)
      const isCollecting = newCollectionStatus === "COLLECTED"
      if (record) {
        const amount = record.totalAmount
        setToggleAdjustments((prev) => ({
          amountDelta: prev.amountDelta + (isCollecting ? -amount : amount),
          countDelta: prev.countDelta + (isCollecting ? -1 : 1),
        }))
      }

      toggleMutation.mutate(
        { id, collectionStatus: newCollectionStatus },
        {
          onError: () => {
            // 실패 시 롤백
            setToggledItems((prev) => {
              const next = new Map(prev)
              next.delete(id)
              return next
            })
            // 요약 보정 롤백
            if (record) {
              const amount = record.totalAmount
              setToggleAdjustments((prev) => ({
                amountDelta: prev.amountDelta + (isCollecting ? amount : -amount),
                countDelta: prev.countDelta + (isCollecting ? 1 : -1),
              }))
            }
          },
          onSettled: () => {
            setTogglingId(null)
          },
        }
      )
    },
    [toggleMutation, data]
  )

  // 일괄 수금 처리 핸들러 (낙관적 업데이트)
  const handleBatchCollect = useCallback(
    (ids: string[]) => {
      const storeName = displayRecords.find((r) => ids.includes(r.id))?.storeNameSnapshot
      setBatchTogglingStore(storeName ?? null)

      // 낙관적 업데이트: 모든 ID를 수금 완료로 설정
      setToggledItems((prev) => {
        const next = new Map(prev)
        for (const id of ids) {
          next.set(id, "COLLECTED")
        }
        return next
      })

      // 요약 보정
      const totalAmount = ids.reduce((sum, id) => {
        const record = data?.records.find((r) => r.id === id)
        return sum + (record?.totalAmount ?? 0)
      }, 0)
      setToggleAdjustments((prev) => ({
        amountDelta: prev.amountDelta - totalAmount,
        countDelta: prev.countDelta - ids.length,
      }))

      batchMutation.mutate(
        { ids, collectionStatus: "COLLECTED" },
        {
          onError: () => {
            // 실패 시 롤백
            setToggledItems((prev) => {
              const next = new Map(prev)
              for (const id of ids) {
                next.delete(id)
              }
              return next
            })
            setToggleAdjustments((prev) => ({
              amountDelta: prev.amountDelta + totalAmount,
              countDelta: prev.countDelta + ids.length,
            }))
          },
          onSettled: () => {
            setBatchTogglingStore(null)
          },
        }
      )
    },
    [batchMutation, displayRecords, data]
  )

  // 매장명 검색 실행
  const handleStoreSearch = useCallback(() => {
    setSearchStoreName(storeName.trim())
  }, [storeName])

  // 뷰 모드 전환
  const handleViewChange = useCallback((newView: ViewMode) => {
    setView(newView)
    setPage(1)
    setToggledItems(new Map())
    setToggleAdjustments({ amountDelta: 0, countDelta: 0 })
  }, [])

  const yearOptions = getYearOptions()

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 필터 컨트롤 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {view === "date" ? (
          <>
            {/* 연도 선택 */}
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

            {/* 월 선택 */}
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
          </>
        ) : (
          <>
            {/* 매장명 검색 */}
            <div className="flex gap-1.5 flex-1 min-w-0">
              <Input
                className="h-8 text-sm"
                placeholder="매장명 검색"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleStoreSearch()
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleStoreSearch}
              >
                <Search className="size-4" />
              </Button>
            </div>
          </>
        )}

        {/* 뷰 토글 */}
        <div className="flex gap-1 ml-auto shrink-0">
          <Button
            variant={view === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("date")}
          >
            날짜별
          </Button>
          <Button
            variant={view === "store" ? "default" : "outline"}
            size="sm"
            onClick={() => handleViewChange("store")}
          >
            매장별
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">미수금 합계</span>
          <span className="text-lg font-bold text-red-600">
            {dynamicSummary.totalOutstanding.toLocaleString()}원
          </span>
        </div>
        <div className="text-xs text-gray-500 text-right mt-1">
          {dynamicSummary.count}건
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 에러 상태 */}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive text-sm">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        </div>
      )}

      {/* 미수금 목록 */}
      {data && (
        <div className="space-y-3">
          {view === "date" ? (
            // 날짜별 보기: 플랫 리스트
            displayRecords.length > 0 ? (
              displayRecords.map((record) => (
                <OutstandingCard
                  key={record.id}
                  record={record}
                  onToggle={handleToggle}
                  isToggling={togglingId === record.id}
                />
              ))
            ) : (
              <div className="text-center py-16 text-sm text-gray-400">
                미수금이 없습니다
              </div>
            )
          ) : (
            // 매장별 보기: 매장 그룹 카드
            storeGroups.length > 0 ? (
              storeGroups.map((group) => (
                <StoreOutstandingCard
                  key={group.storeName}
                  group={group}
                  onToggle={handleToggle}
                  onBatchCollect={handleBatchCollect}
                  togglingId={togglingId}
                  isBatchToggling={batchTogglingStore === group.storeName}
                />
              ))
            ) : (
              <div className="text-center py-16 text-sm text-gray-400">
                {view === "store" && searchStoreName
                  ? "검색 결과가 없습니다"
                  : "미수금이 없습니다"}
              </div>
            )
          )}
        </div>
      )}

      {/* 페이지네이션 */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.hasPrev}
            onClick={() => setPage((p) => p - 1)}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {data.pagination.page} / {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.pagination.hasNext}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
