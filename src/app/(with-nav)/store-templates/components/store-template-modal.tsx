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
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableDropdown } from "@/components/common"
import { useDropdownState } from "@/hooks/use-dropdown-state"
import { useUsers } from "@/hooks/use-users"
import { cn } from "@/lib/utils"
import { useStores, type Store } from "@/app/(with-nav)/stores/hooks/use-stores"
import type { StoreTemplate, UpdateStoreTemplateInput } from "../hooks/use-store-templates"

// 코스 스키마
const templateSchema = z.object({
  name: z.string().min(1, "코스 이름을 입력해주세요"),
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
  onSubmit: (data: UpdateStoreTemplateInput) => void
  editTemplate?: StoreTemplate | null
  isLoading?: boolean
}

// Sortable 매장 아이템 컴포넌트
function SortableStoreItem({
  item,
  index,
  onRemove,
}: {
  item: SelectedStore
  index: number
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

      {/* 순서 번호 (표시 순서 기준 - 삭제된 매장이 있어도 번호가 건너뛰지 않음) */}
      <div className="size-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
        {index + 1}
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
 * 매장 코스 추가/수정 모달
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

  // 매장 목록 조회 (모달이 열려 있을 때만)
  const { data: stores = [], isLoading: isLoadingStores } = useStores(undefined, { enabled: open })

  // 담당자 이전: 선택된 담당자 ID와 매장 함께 이전 확인 대기 중인 제출 데이터
  const [ownerId, setOwnerId] = useState("")
  const [pendingSubmit, setPendingSubmit] = useState<UpdateStoreTemplateInput | null>(null)

  // 직원 목록 조회 (수정 모드로 열려 있을 때만), 읽기 전용(VIEWER)은 이전 대상에서 제외
  const { data: users = [] } = useUsers(open && !!editTemplate)
  const currentOwnerId = internalEditTemplate?.userId ?? ""
  const ownerOptions = useMemo(() => {
    const writableUsers = users.filter((user) => user.role !== "VIEWER")
    // 현재 담당자를 맨 위에 표시
    return [
      ...writableUsers.filter((user) => user.id === currentOwnerId),
      ...writableUsers.filter((user) => user.id !== currentOwnerId),
    ]
  }, [users, currentOwnerId])
  const getUserName = (id: string) => users.find((user) => user.id === id)?.name

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
  // open prop을 트리거로 한 외부 시스템(폼/선택 매장/드롭다운) 동기화 — useEffect가 적합한 케이스
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (open) {
      setInternalEditTemplate(editTemplate ?? null)
      storeDropdown.reset()
      setOwnerId(editTemplate?.userId ?? "")
      setPendingSubmit(null)

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
            PaymentType: "ACCOUNT",
            receiptType: "NONE",
            kakaoPlaceId: null,
            latitude: null,
            longitude: null,
            assignedUserId: member.store.assignedUserId,
            note: null,
            assignedUser: null,
            storeItems: [],
          },
          order: member.order,
        }))
        setSelectedStores(existingStores)
      } else {
        reset({ name: "", description: "" })
        setSelectedStores([])
      }
    }
  }, [open, editTemplate, reset])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

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

  // 함께 이전 가능한 매장 수 (기존 코스 담당자 담당이거나 담당자 미지정인 매장)
  const transferableStoreCount = selectedStores.filter(
    (s) => s.store.assignedUserId === currentOwnerId || s.store.assignedUserId === null
  ).length

  // 폼 제출 핸들러
  const handleFormSubmit = (data: TemplateFormData) => {
    const submitData: UpdateStoreTemplateInput = {
      name: data.name,
      description: data.description,
      members: selectedStores.map((s) => ({
        storeId: s.storeId,
        order: s.order,
      })),
    }

    // 담당자를 바꾸지 않았으면 기존대로 저장
    const isTransfer = isEditMode && !!ownerId && ownerId !== currentOwnerId
    if (!isTransfer) {
      onSubmit(submitData)
      return
    }

    // 함께 이전할 매장이 없으면 묻지 않고 코스만 이전
    if (transferableStoreCount === 0) {
      onSubmit({ ...submitData, ownerId, transferStores: false })
      return
    }

    // 매장 담당자도 이전할지 확인 단계로 전환
    setPendingSubmit({ ...submitData, ownerId })
  }

  // 확인 단계에서 선택한 방식으로 이전
  const handleTransferConfirm = (transferStores: boolean) => {
    if (!pendingSubmit) return
    onSubmit({ ...pendingSubmit, transferStores })
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {pendingSubmit
              ? "코스 담당자 이전"
              : isEditMode
                ? "매장 코스 수정"
                : "매장 코스 추가"}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        {/* 매장 담당자 함께 이전 확인 단계 (모달 안에서 전환, 폼 입력값은 유지) */}
        {pendingSubmit && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-3 px-4 sm:px-1">
              <p className="text-sm text-gray-900">
                코스 내 매장 {transferableStoreCount}개의 담당자도{" "}
                <span className="font-semibold">
                  {getUserName(pendingSubmit.ownerId ?? "") ?? "선택한 직원"}
                </span>
                님에게 이전할까요?
              </p>
              <p className="text-xs text-gray-500">
                기존 담당자({getUserName(currentOwnerId) ?? "기존 담당자"}) 또는 담당자 미지정
                매장만 변경되며, 다른 직원이 담당하는 매장은 그대로 유지됩니다.
              </p>
            </div>

            <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingSubmit(null)}
                disabled={isLoading}
              >
                돌아가기
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTransferConfirm(false)}
                disabled={isLoading}
              >
                코스만 이전
              </Button>
              <Button
                type="button"
                onClick={() => handleTransferConfirm(true)}
                disabled={isLoading}
              >
                {isLoading ? "처리 중..." : "매장도 함께 이전"}
              </Button>
            </ResponsiveModalFooter>
          </div>
        )}

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className={cn("flex flex-col flex-1 overflow-hidden", pendingSubmit && "hidden")}
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
          {/* 코스 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">코스 이름</Label>
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
              placeholder="코스 설명을 입력하세요..."
              {...register("description")}
            />
          </div>

          {/* 코스 담당자 (수정 모드에서만, 다른 직원 선택 시 이전) */}
          {isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="ownerId">코스 담당자</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger id="ownerId">
                  <SelectValue placeholder="담당자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.id === currentOwnerId ? `${user.name} (현재)` : user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {ownerId && ownerId !== currentOwnerId && (
                <p className="text-xs text-blue-600">
                  저장하면 코스가 {getUserName(ownerId)}님에게 이전됩니다
                </p>
              )}
            </div>
          )}

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
                emptyMessage={isLoadingStores ? "매장 목록을 불러오는 중..." : "검색 결과가 없습니다"}
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
                      {selectedStores.map((item, index) => (
                        <SortableStoreItem
                          key={item.id}
                          item={item}
                          index={index}
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

          <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
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
              disabled={isLoading || !isValid}
            >
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
