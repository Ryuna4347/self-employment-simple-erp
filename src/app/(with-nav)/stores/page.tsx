"use client"

import { useState, useMemo } from "react"
import { Plus, Search, Store as StoreIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { StoreCard, StoreModal } from "./components"
import {
  useStores,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
  type Store,
  type StoreInput,
} from "./hooks/use-stores"

/**
 * 매장 관리 페이지
 */
export default function StoresPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<Store | null>(null)

  // react-query 훅
  const { data: stores = [], isLoading } = useStores()
  const createMutation = useCreateStore()
  const updateMutation = useUpdateStore()
  const deleteMutation = useDeleteStore()

  // 검색 필터링 (클라이언트)
  const filteredStores = useMemo(() => {
    if (!searchTerm.trim()) return stores
    const term = searchTerm.toLowerCase()
    return stores.filter(
      (store) =>
        store.name.toLowerCase().includes(term) ||
        store.address.toLowerCase().includes(term) ||
        (store.managerName?.toLowerCase().includes(term) ?? false)
    )
  }, [stores, searchTerm])

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
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="매장명, 주소, 담당자 검색..."
            className="pl-10"
          />
        </div>
      </div>

      {/* 매장 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          // 로딩 상태
          <div className="text-center py-12 text-gray-400">로딩 중...</div>
        ) : filteredStores.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
            <StoreIcon className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {searchTerm ? "검색 결과가 없습니다" : "등록된 매장이 없습니다"}
            </p>
            {!searchTerm && (
              <p className="text-gray-400 text-sm mt-1">
                우측 하단 버튼을 눌러 매장을 추가하세요
              </p>
            )}
          </div>
        ) : (
          // 매장 리스트
          filteredStores.map((store) => (
            <StoreCard
              key={store.id}
              store={store}
              onEdit={handleEditStore}
              onDelete={handleDeleteStore}
            />
          ))
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={handleAddStore}
        className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="매장 추가"
      >
        <Plus className="size-6" />
      </button>

      {/* 매장 추가/수정 모달 */}
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
    </div>
  )
}
