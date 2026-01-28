"use client"

import { useState, useMemo } from "react"
import { Plus, Search, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { SaleItemCard, SaleItemModal } from "./components"
import {
  useSaleItems,
  useCreateSaleItem,
  useUpdateSaleItem,
  useDeleteSaleItem,
  type SaleItem,
} from "./hooks/use-sale-items"

/**
 * 물품 관리 페이지
 */
export default function SaleItemsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<SaleItem | null>(null)

  // react-query 훅
  const { data: items = [], isLoading } = useSaleItems()
  const createMutation = useCreateSaleItem()
  const updateMutation = useUpdateSaleItem()
  const deleteMutation = useDeleteSaleItem()

  // 검색 필터링 (클라이언트)
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter((item) => item.name.toLowerCase().includes(term))
  }, [items, searchTerm])

  // 물품 추가 버튼 핸들러
  const handleAddItem = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  // 물품 수정 버튼 핸들러
  const handleEditItem = (item: SaleItem) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  // 물품 삭제 핸들러
  const handleDeleteItem = (id: string) => {
    deleteMutation.mutate(id)
  }

  // 모달 제출 핸들러
  const handleModalSubmit = (data: { name: string; unitPrice: number }) => {
    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, ...data },
        {
          onSuccess: () => {
            setIsModalOpen(false)
            setEditingItem(null)
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
        <h1 className="text-xl font-bold text-gray-900 mb-2">물품 관리</h1>
        <p className="text-gray-600 text-sm">
          판매 물품의 표준 단가를 관리합니다
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
            placeholder="물품명 검색..."
            className="pl-10"
          />
        </div>
      </div>

      {/* 물품 목록 */}
      <div className="space-y-3">
        {isLoading ? (
          // 로딩 상태
          <div className="text-center py-12 text-gray-400">
            로딩 중...
          </div>
        ) : filteredItems.length === 0 ? (
          // 빈 상태
          <div className="text-center py-12">
            <Package className="size-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">
              {searchTerm ? "검색 결과가 없습니다" : "등록된 물품이 없습니다"}
            </p>
            {!searchTerm && (
              <p className="text-gray-400 text-sm mt-1">
                우측 하단 버튼을 눌러 물품을 추가하세요
              </p>
            )}
          </div>
        ) : (
          // 물품 리스트
          filteredItems.map((item) => (
            <SaleItemCard
              key={item.id}
              item={item}
              onEdit={handleEditItem}
              onDelete={handleDeleteItem}
            />
          ))
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        onClick={handleAddItem}
        className="fixed bottom-[5.75rem] right-6 size-14 rounded-full shadow-lg transition-all z-40 flex items-center justify-center bg-primary hover:bg-primary/90 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="물품 추가"
      >
        <Plus className="size-6" />
      </button>

      {/* 물품 추가/수정 모달 */}
      <SaleItemModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setEditingItem(null)
        }}
        onSubmit={handleModalSubmit}
        editItem={editingItem}
        isLoading={isSubmitting}
      />
    </div>
  )
}
