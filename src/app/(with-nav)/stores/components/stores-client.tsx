"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { Plus, Search, Store as StoreIcon } from "lucide-react"
import { useUser } from "@/components/providers/app-providers"
import { canWrite } from "@/lib/role-utils"
import { RefreshFab } from "@/components/common/refresh-fab"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { StoreCard, StoreModal } from "./index"
import {
  useStoresInfinite,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
  type Store,
  type StoreInput,
} from "../hooks/use-stores"

/**
 * 매장 관리 클라이언트 컴포넌트
 */
export function StoresClient() {
  const { role } = useUser()
  const writable = canWrite(role)
  const [storeName, setStoreName] = useState("")
  const [searchStoreName, setSearchStoreName] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)

  // react-query 훅
  const {
    data,
    isLoading,
    refetch,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStoresInfinite(searchStoreName || undefined)
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()
  const deleteMutation = useDeleteStore()

  // 페이지 플래튼
  const stores = useMemo(
    () => data?.pages.flatMap((page) => page.stores) ?? [],
    [data]
  )

  // 무한 스크롤 트리거
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // 검색 실행
  const handleSearch = useCallback(() => {
    setSearchStoreName(storeName.trim())
  }, [storeName])

  // 매장 추가 버튼 핸들러
  const handleAddStore = () => {
    setEditingStore(null)
    setIsModalOpen(true)
  }

  // 매장 수정 버튼 핸들러
  const handleEditStore = (store: Store) => {
    setEditingStore(store)
    setIsModalOpen(true)
  }

  // 매장 삭제 핸들러
  const handleDeleteStore = (id: string) => {
    deleteMutation.mutate(id)
  }

  // 모달 제출 핸들러
  const handleModalSubmit = (data: StoreInput) => {
    if (editingStore) {
      updateMutation.mutate(
        { id: editingStore.id, ...data },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingStore(null)
          },
        }
      )
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false)
        },
      })
    }
  }

  // 삭제 진행 중인 매장 ID
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">매장 관리</h1>
        <p className="text-gray-600 text-sm">
          매장 정보와 기본 품목을 관리합니다
        </p>
      </div>

      {/* 검색 */}
      <div className="flex gap-1.5 mb-4">
        <Input
          className="h-8 text-sm"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch()
          }}
          placeholder="매장명, 주소, 담당자 검색..."
        />
        <Button variant="outline" size="sm" onClick={handleSearch}>
          <Search className="size-4" />
        </Button>
      </div>

      {/* 매장 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          // 로딩 상태
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : stores.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
            <StoreIcon className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {searchStoreName ? "검색 결과가 없습니다" : "등록된 매장이 없습니다"}
            </p>
            {!searchStoreName && (
              <p className="text-gray-400 text-sm mt-1">
                우측 하단 버튼을 눌러 매장을 추가하세요
              </p>
            )}
          </div>
        ) : (
          // 매장 리스트
          stores.map((store, index) => (
            <StoreCard
              key={store.id}
              store={store}
              index={index}
              onEdit={writable ? handleEditStore : undefined}
              onDelete={writable ? handleDeleteStore : undefined}
              isDeleting={deletingId === store.id}
            />
          ))
        )}
      </div>

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
      )}

      {/* 새로고침 버튼 */}
      <RefreshFab
        onRefresh={() => refetch()}
        isFetching={isFetching}
        offset="stacked"
      />

      {/* FAB (Floating Action Button) */}
      {writable && (
        <button
          onClick={handleAddStore}
          className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          aria-label="매장 추가"
        >
          <Plus className="size-6" />
        </button>
      )}

      {/* 매장 추가/수정 모달 */}
      {writable && (
        <StoreModal
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open)
            if (!open) setEditingStore(null)
          }}
          onSubmit={handleModalSubmit}
          editStore={editingStore}
          isLoading={isSubmitting}
        />
      )}
    </div>
  )
}
