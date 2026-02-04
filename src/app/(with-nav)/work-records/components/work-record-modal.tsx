"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus, X, Search, MapPin } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useStores, type Store } from "@/app/(with-nav)/stores/hooks/use-stores"
import { useSaleItems, type SaleItem } from "@/app/(with-nav)/sale-items/hooks/use-sale-items"
import {
  useCreateWorkRecord,
  useUpdateWorkRecord,
  type WorkRecordResponse,
} from "../hooks/use-work-records"

// 품목 스키마
const recordItemSchema = z.object({
  name: z.string().min(1, "품명을 입력해주세요"),
  unitPrice: z.number().int().min(0, "단가를 입력해주세요"),
  quantity: z.number().int().min(1, "수량을 입력해주세요"),
})

// 근무기록 폼 스키마
const workRecordFormSchema = z.object({
  storeId: z.string().min(1, "매장을 선택해주세요"),
  isCollected: z.boolean(),
  note: z.string().optional(),
  items: z.array(recordItemSchema).min(1, "최소 1개 품목이 필요합니다"),
})

type WorkRecordFormData = z.infer<typeof workRecordFormSchema>

interface WorkRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  editRecord?: WorkRecordResponse | null
}

// 결제방식 한글 변환
function formatPaymentType(type: string): string {
  const types: Record<string, string> = {
    CASH: "현금",
    ACCOUNT: "계좌이체",
    CARD: "카드",
  }
  return types[type] ?? type
}

export function WorkRecordModal({
  open,
  onOpenChange,
  selectedDate,
  editRecord,
}: WorkRecordModalProps) {
  // 수정 모드 확인 (애니메이션 중 라벨 변경 방지)
  const [internalEditRecord, setInternalEditRecord] = useState<WorkRecordResponse | null>(null)
  const isEditMode = !!internalEditRecord

  // 매장 검색 상태
  const [storeSearchTerm, setStoreSearchTerm] = useState("")
  const [showStoreDropdown, setShowStoreDropdown] = useState(false)
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const storeDropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 품목 자동완성 상태
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<number, string>>({})
  const [showItemDropdown, setShowItemDropdown] = useState<Record<number, boolean>>({})
  const itemDropdownTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})

  // 데이터 조회
  const { data: stores = [] } = useStores(undefined)
  const { data: saleItems = [] } = useSaleItems(undefined, { enabled: open })

  // Mutations
  const createMutation = useCreateWorkRecord()
  const updateMutation = useUpdateWorkRecord()
  const isLoading = createMutation.isPending || updateMutation.isPending

  // 매장 검색 필터링
  const filteredStores = useMemo(() => {
    if (!storeSearchTerm) return stores.slice(0, 10)
    return stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(storeSearchTerm.toLowerCase()) ||
          store.address.toLowerCase().includes(storeSearchTerm.toLowerCase())
      )
      .slice(0, 10)
  }, [stores, storeSearchTerm])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<WorkRecordFormData>({
    resolver: zodResolver(workRecordFormSchema),
    mode: "onChange",
    defaultValues: {
      storeId: "",
      isCollected: false,
      note: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const isCollected = watch("isCollected")

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setInternalEditRecord(editRecord ?? null)
      setItemSearchTerms({})
      setShowItemDropdown({})
      setShowStoreDropdown(false)

      if (editRecord) {
        // 수정 모드: 기존 데이터로 초기화
        const store = stores.find((s) => s.id === editRecord.storeId)
        setSelectedStore(store ?? null)
        setStoreSearchTerm(editRecord.store.name)

        const initialSearchTerms: Record<number, string> = {}
        editRecord.items.forEach((item, index) => {
          initialSearchTerms[index] = item.name
        })
        setItemSearchTerms(initialSearchTerms)

        reset({
          storeId: editRecord.storeId,
          isCollected: editRecord.isCollected,
          note: editRecord.note ?? "",
          items: editRecord.items.map((item) => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        })
      } else {
        // 추가 모드: 빈 값으로 초기화
        setSelectedStore(null)
        setStoreSearchTerm("")
        reset({
          storeId: "",
          isCollected: false,
          note: "",
          items: [],
        })
      }
    }
  }, [open, editRecord, stores, reset])

  // 매장 선택 핸들러
  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store)
    setValue("storeId", store.id, { shouldValidate: true })
    setStoreSearchTerm(store.name)
    setShowStoreDropdown(false)

    // 매장 기본 품목 로드 (추가 모드에서만)
    if (!isEditMode && store.storeItems.length > 0) {
      const newItems = store.storeItems.map((item) => ({
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }))
      setValue("items", newItems, { shouldValidate: true })

      // 검색어 상태도 동기화
      const newSearchTerms: Record<number, string> = {}
      store.storeItems.forEach((item, index) => {
        newSearchTerms[index] = item.name
      })
      setItemSearchTerms(newSearchTerms)
    }
  }

  // 품목 선택 핸들러
  const handleSaleItemSelect = (index: number, saleItem: SaleItem) => {
    setValue(`items.${index}.name`, saleItem.name, { shouldValidate: true })
    setValue(`items.${index}.unitPrice`, saleItem.unitPrice, { shouldValidate: true })
    setItemSearchTerms((prev) => ({ ...prev, [index]: saleItem.name }))
    setShowItemDropdown((prev) => ({ ...prev, [index]: false }))
  }

  // 품목 추가 핸들러
  const handleAddItem = () => {
    const newIndex = fields.length
    append({ name: "", unitPrice: 0, quantity: 1 })
    setItemSearchTerms((prev) => ({ ...prev, [newIndex]: "" }))
  }

  // 품목 삭제 핸들러
  const handleRemoveItem = (index: number) => {
    remove(index)
    // 검색어 상태 재정렬
    setItemSearchTerms((prev) => {
      const newTerms: Record<number, string> = {}
      Object.keys(prev).forEach((key) => {
        const keyNum = parseInt(key)
        if (keyNum < index) {
          newTerms[keyNum] = prev[keyNum]
        } else if (keyNum > index) {
          newTerms[keyNum - 1] = prev[keyNum]
        }
      })
      return newTerms
    })
  }

  // 총 금액 계산
  const totalAmount = useMemo(() => {
    return fields.reduce((sum, _, index) => {
      const unitPrice = watch(`items.${index}.unitPrice`) ?? 0
      const quantity = watch(`items.${index}.quantity`) ?? 0
      return sum + unitPrice * quantity
    }, 0)
  }, [fields, watch])

  // 폼 제출 핸들러
  const handleFormSubmit = (data: WorkRecordFormData) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")

    if (isEditMode && internalEditRecord) {
      updateMutation.mutate(
        {
          id: internalEditRecord.id,
          isCollected: data.isCollected,
          note: data.note,
          items: data.items,
        },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    } else {
      createMutation.mutate(
        {
          date: dateStr,
          storeId: data.storeId,
          isCollected: data.isCollected,
          note: data.note,
          items: data.items,
        },
        {
          onSuccess: () => {
            onOpenChange(false)
          },
        }
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "근무기록 수정" : "근무기록 추가"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 px-1"
        >
          {/* 방문 일자 (읽기 전용) */}
          <div className="space-y-2">
            <Label>방문 일자</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
              {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
            </div>
          </div>

          {/* 매장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="store">매장 선택</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                <Input
                  id="store"
                  placeholder="매장명 또는 주소로 검색..."
                  value={storeSearchTerm}
                  onChange={(e) => {
                    setStoreSearchTerm(e.target.value)
                    setShowStoreDropdown(true)
                    if (!e.target.value) {
                      setSelectedStore(null)
                      setValue("storeId", "", { shouldValidate: true })
                    }
                  }}
                  onFocus={() => setShowStoreDropdown(true)}
                  onBlur={() => {
                    if (storeDropdownTimeoutRef.current) {
                      clearTimeout(storeDropdownTimeoutRef.current)
                    }
                    storeDropdownTimeoutRef.current = setTimeout(() => {
                      setShowStoreDropdown(false)
                    }, 200)
                  }}
                  className="pl-9"
                  aria-invalid={!!errors.storeId}
                  disabled={isEditMode}
                />
              </div>

              {/* 매장 드롭다운 */}
              {showStoreDropdown && !isEditMode && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredStores.length > 0 ? (
                    filteredStores.map((store) => (
                      <button
                        key={store.id}
                        type="button"
                        onMouseDown={() => handleStoreSelect(store)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{store.name}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="size-3" />
                          {store.address}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.storeId && (
              <p className="text-sm text-red-500">{errors.storeId.message}</p>
            )}
          </div>

          {/* 선택된 매장 정보 */}
          {selectedStore && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">결제방식</span>
                <span className="font-medium">{formatPaymentType(selectedStore.PaymentType)}</span>
              </div>
              {selectedStore.managerName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">담당자</span>
                  <span className="font-medium">{selectedStore.managerName}</span>
                </div>
              )}
            </div>
          )}

          {/* 수금 상태 */}
          <div className="space-y-2">
            <Label>수금 상태</Label>
            <RadioGroup
              value={isCollected ? "collected" : "uncollected"}
              onValueChange={(value) =>
                setValue("isCollected", value === "collected", { shouldValidate: true })
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="collected" id="collected" />
                <Label htmlFor="collected" className="font-normal cursor-pointer">
                  수금 완료
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uncollected" id="uncollected" />
                <Label htmlFor="uncollected" className="font-normal cursor-pointer">
                  미수
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 품목 섹션 */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label>거래 품목</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="size-4" />
                품목 추가
              </Button>
            </div>

            {errors.items?.root && (
              <p className="text-sm text-red-500 mb-2">{errors.items.root.message}</p>
            )}

            <div className="space-y-3">
              {fields.map((field, index) => {
                const unitPrice = watch(`items.${index}.unitPrice`) ?? 0
                const quantity = watch(`items.${index}.quantity`) ?? 0
                const subtotal = unitPrice * quantity

                return (
                  <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      {/* 품명 (Autocomplete) */}
                      <div className="col-span-5 relative">
                        <Label className="text-xs text-gray-600">품명</Label>
                        <Input
                          placeholder="품목 검색..."
                          value={itemSearchTerms[index] ?? ""}
                          onChange={(e) => {
                            const value = e.target.value
                            setItemSearchTerms((prev) => ({ ...prev, [index]: value }))
                            setValue(`items.${index}.name`, value, { shouldValidate: true })
                            setShowItemDropdown((prev) => ({ ...prev, [index]: true }))
                          }}
                          onFocus={() =>
                            setShowItemDropdown((prev) => ({ ...prev, [index]: true }))
                          }
                          onBlur={() => {
                            if (itemDropdownTimeoutRef.current[index]) {
                              clearTimeout(itemDropdownTimeoutRef.current[index])
                            }
                            itemDropdownTimeoutRef.current[index] = setTimeout(() => {
                              setShowItemDropdown((prev) => ({ ...prev, [index]: false }))
                            }, 200)
                          }}
                          className="mt-1"
                          aria-invalid={!!errors.items?.[index]?.name}
                        />

                        {/* Autocomplete 드롭다운 */}
                        {showItemDropdown[index] && (itemSearchTerms[index] ?? "").length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {saleItems
                              .filter((item) =>
                                item.name
                                  .toLowerCase()
                                  .includes((itemSearchTerms[index] ?? "").toLowerCase())
                              )
                              .slice(0, 5)
                              .map((item) => (
                                <button
                                  key={item.id}
                                  type="button"
                                  onMouseDown={() => handleSaleItemSelect(index, item)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50"
                                >
                                  <p className="text-sm text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {item.unitPrice.toLocaleString()}원
                                  </p>
                                </button>
                              ))}
                            {saleItems.filter((item) =>
                              item.name
                                .toLowerCase()
                                .includes((itemSearchTerms[index] ?? "").toLowerCase())
                            ).length === 0 && (
                              <div className="px-3 py-2 text-sm text-gray-400">
                                검색 결과가 없습니다
                              </div>
                            )}
                          </div>
                        )}
                        {errors.items?.[index]?.name && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.name?.message}
                          </p>
                        )}
                      </div>

                      {/* 단가 */}
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">단가</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...register(`items.${index}.unitPrice`, {
                            valueAsNumber: true,
                          })}
                          className="mt-1"
                          aria-invalid={!!errors.items?.[index]?.unitPrice}
                        />
                        {errors.items?.[index]?.unitPrice && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.unitPrice?.message}
                          </p>
                        )}
                      </div>

                      {/* 수량 */}
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">수량</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="1"
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                          className="mt-1"
                          aria-invalid={!!errors.items?.[index]?.quantity}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.quantity?.message}
                          </p>
                        )}
                      </div>

                      {/* 삭제 버튼 */}
                      <div className="col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-6"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 소계 */}
                    <div className="text-right text-sm text-gray-600">
                      소계: <span className="font-medium">{subtotal.toLocaleString()}</span>원
                    </div>
                  </div>
                )
              })}

              {fields.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  품목을 추가해주세요
                </div>
              )}
            </div>

            {/* 총 금액 */}
            {fields.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-900">총 금액</span>
                  <span className="text-lg font-bold text-blue-600">
                    {totalAmount.toLocaleString()}원
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="note">특이사항</Label>
            <Textarea
              id="note"
              placeholder="메모를 입력하세요..."
              {...register("note")}
              rows={3}
            />
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
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
