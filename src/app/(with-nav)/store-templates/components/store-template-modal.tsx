"use client"

import { useEffect, useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { X, GripVertical, MapPin } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableDropdown } from "@/components/common"
import { useDropdownState } from "@/hooks/use-dropdown-state"
import { cn } from "@/lib/utils"
import { useStores, type Store } from "@/app/(with-nav)/stores/hooks/use-stores"
import type { StoreTemplate, StoreTemplateInput } from "../hooks/use-store-templates"

// 템플릿 스키마
const templateSchema = z.object({
  name: z.string().min(1, "템플릿 이름을 입력해주세요"),
  description: z.string().optional(),
})

type TemplateFormData = z.infer<typeof templateSchema>

// 선택된 매장 타입
interface SelectedStore {
  id: string // 임시 ID (dnd-kit용)
  storeId: string
  store: Store
  order: number
}

interface StoreTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: StoreTemplateInput) => void
  editTemplate?: StoreTemplate | null
  isLoading?: boolean
}

// Sortable 매장 아이템 컴포넌트
function SortableStoreItem({
  item,
  onRemove,
}: {
  item: SelectedStore
  onRemove: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-gray-50 rounded-lg border-2 border-transparent",
        isDragging && "border-blue-500 opacity-50"
      )}
    >
      {/* 드래그 핸들 */}
      <button
        type="button"
        className="cursor-move touch-none text-gray-400 hover:text-gray-600"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-5" />
      </button>

      {/* 순서 번호 */}
      <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
        {item.order + 1}
      </div>

      {/* 매장 정보 */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{item.store.name}</p>
        <p className="text-gray-600 text-xs flex items-center gap-1">
          <MapPin className="size-3" />
          <span className="line-clamp-1">{item.store.address}</span>
        </p>
      </div>

      {/* 삭제 버튼 */}
      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-red-500 hover:bg-red-50 rounded transition"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

/**
 * 매장 템플릿 추가/수정 모달
 */
export function StoreTemplateModal({
  open,
  onOpenChange,
  onSubmit,
  editTemplate,
  isLoading,
}: StoreTemplateModalProps) {
  // 닫힘 애니메이션 중 라벨 변경 방지
  const [internalEditTemplate, setInternalEditTemplate] = useState<StoreTemplate | null>(null)
  const isEditMode = !!internalEditTemplate

  // 매장 검색 상태 (공용 Hook 사용)
  const storeDropdown = useDropdownState()

  // 선택된 매장 목록
  const [selectedStores, setSelectedStores] = useState<SelectedStore[]>([])

  // 매장 목록 조회
  const { data: stores = [] } = useStores(undefined)

  // DnD 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      description: "",
    },
  })

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setInternalEditTemplate(editTemplate ?? null)
      storeDropdown.reset()

      if (editTemplate) {
        // 수정 모드
        reset({
          name: editTemplate.name,
          description: editTemplate.description ?? "",
        })
        // 기존 멤버를 SelectedStore로 변환
        const existingStores: SelectedStore[] = editTemplate.members.map((member, index) => ({
          id: `store-${member.storeId}-${index}`,
          storeId: member.storeId,
          store: {
            id: member.store.id,
            name: member.store.name,
            address: member.store.address,
            managerName: null,
            PaymentType: "ACCOUNT", // 기본값
            kakaoPlaceId: null,
            latitude: null,
            longitude: null,
            storeItems: [],
          } as Store,
          order: member.order,
        }))
        setSelectedStores(existingStores)
      } else {
        reset({ name: "", description: "" })
        setSelectedStores([])
      }
    }
  }, [open, editTemplate, reset])

  // 드래그 종료 핸들러
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSelectedStores((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const reordered = arrayMove(items, oldIndex, newIndex)
        // 순서 업데이트
        return reordered.map((item, index) => ({ ...item, order: index }))
      })
    }
  }

  // 매장 선택 핸들러
  const handleStoreSelect = (store: Store) => {
    // 이미 선택된 매장인지 확인
    if (selectedStores.some((s) => s.storeId === store.id)) {
      return
    }

    const newStore: SelectedStore = {
      id: `store-${store.id}-${Date.now()}`,
      storeId: store.id,
      store,
      order: selectedStores.length,
    }
    setSelectedStores([...selectedStores, newStore])
    storeDropdown.reset()
  }

  // 매장 제거 핸들러
  const handleRemoveStore = (id: string) => {
    const filtered = selectedStores.filter((s) => s.id !== id)
    // 순서 재정렬
    setSelectedStores(filtered.map((s, index) => ({ ...s, order: index })))
  }

  // 필터링된 매장 목록 (이미 선택된 매장 제외)
  const filteredStores = useMemo(() => {
    return stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(storeDropdown.searchTerm.toLowerCase()) &&
          !selectedStores.some((s) => s.storeId === store.id)
      )
      .slice(0, 5)
  }, [stores, storeDropdown.searchTerm, selectedStores])

  // 폼 제출 핸들러
  const handleFormSubmit = (data: TemplateFormData) => {
    if (selectedStores.length === 0) {
      alert("최소 1개 이상의 매장을 선택해주세요")
      return
    }

    const submitData: StoreTemplateInput = {
      name: data.name,
      description: data.description,
      members: selectedStores.map((s) => ({
        storeId: s.storeId,
        order: s.order,
      })),
    }
    onSubmit(submitData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "매장 템플릿 수정" : "매장 템플릿 추가"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* 템플릿 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">템플릿 이름</Label>
            <Input
              id="name"
              placeholder="예: 월요일 서초 코스"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명 (선택)</Label>
            <Input
              id="description"
              placeholder="템플릿 설명을 입력하세요..."
              {...register("description")}
            />
          </div>

          {/* 매장 검색 및 선택 */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2 mb-4">
              <Label>매장 추가</Label>
              <SearchableDropdown
                searchTerm={storeDropdown.searchTerm}
                onSearchChange={storeDropdown.handleSearchChange}
                showDropdown={storeDropdown.showDropdown && storeDropdown.searchTerm.length > 0}
                onFocus={() => storeDropdown.setShowDropdown(true)}
                onBlur={storeDropdown.handleBlur}
                items={filteredStores}
                getItemKey={(store) => store.id}
                renderItem={(store) => (
                  <>
                    <p className="font-medium text-gray-900 text-sm">{store.name}</p>
                    <p className="text-gray-600 text-xs flex items-center gap-1">
                      <MapPin className="size-3" />
                      {store.address}
                    </p>
                  </>
                )}
                onItemSelect={handleStoreSelect}
                placeholder="매장 검색..."
                emptyMessage="검색 결과가 없습니다"
              />
            </div>

            {/* 선택된 매장 목록 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label>선택된 매장 ({selectedStores.length})</Label>
                {selectedStores.length > 1 && (
                  <p className="text-xs text-gray-500">
                    드래그하여 순서 변경
                  </p>
                )}
              </div>

              {selectedStores.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={selectedStores.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {selectedStores.map((item) => (
                        <SortableStoreItem
                          key={item.id}
                          item={item}
                          onRemove={() => handleRemoveStore(item.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-lg">
                  매장을 추가해주세요
                </div>
              )}
            </div>
          </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isValid || selectedStores.length === 0}
            >
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
