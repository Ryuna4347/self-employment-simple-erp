"use client"

import { useEffect, useState, useRef } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Store, StoreInput } from "../hooks/use-stores"
import { useSaleItems, type SaleItem } from "@/app/(with-nav)/sale-items/hooks/use-sale-items"

// 품목 스키마
const storeItemSchema = z.object({
  name: z.string().min(1, "품명을 입력해주세요"),
  unitPrice: z.number().int().min(1, "단가를 입력해주세요"),
  quantity: z.number().int().min(1, "수량을 입력해주세요"),
})

// 매장 스키마
const storeSchema = z.object({
  name: z.string().min(1, "매장명을 입력해주세요"),
  address: z.string().min(1, "주소를 입력해주세요"),
  PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
  managerName: z.string().optional(),
  items: z.array(storeItemSchema).optional(),
})

type StoreFormData = z.infer<typeof storeSchema>

interface StoreModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: StoreInput) => void
  editStore?: Store | null
  isLoading?: boolean
}

/**
 * 매장 추가/수정 모달
 */
export function StoreModal({
  open,
  onOpenChange,
  onSubmit,
  editStore,
  isLoading,
}: StoreModalProps) {
  // 닫힘 애니메이션 중 라벨 변경 방지
  const [internalEditStore, setInternalEditStore] = useState<Store | null>(null)
  const isEditMode = !!internalEditStore

  // Autocomplete 상태
  const [itemSearchTerms, setItemSearchTerms] = useState<Record<number, string>>({})
  const [showDropdown, setShowDropdown] = useState<Record<number, boolean>>({})
  const dropdownTimeoutRef = useRef<Record<number, NodeJS.Timeout>>({})

  // SaleItem 목록 조회 (모달이 열릴 때만)
  const { data: saleItems = [] } = useSaleItems(undefined, { enabled: open })

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      address: "",
      PaymentType: "ACCOUNT",
      managerName: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const paymentType = watch("PaymentType")

  // 모달 열릴 때 외부 editStore를 내부 상태로 동기화
  useEffect(() => {
    if (open) {
      setInternalEditStore(editStore ?? null)
      // Autocomplete 상태 초기화
      setItemSearchTerms({})
      setShowDropdown({})
      if (editStore) {
        // 수정 모드: 기존 품목명을 검색어로 설정
        const initialSearchTerms: Record<number, string> = {}
        editStore.storeItems.forEach((item, index) => {
          initialSearchTerms[index] = item.name
        })
        setItemSearchTerms(initialSearchTerms)
        reset({
          name: editStore.name,
          address: editStore.address,
          PaymentType: editStore.PaymentType,
          managerName: editStore.managerName ?? "",
          items: editStore.storeItems.map((item) => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        })
      } else {
        reset({
          name: "",
          address: "",
          PaymentType: "ACCOUNT",
          managerName: "",
          items: [],
        })
      }
    }
  }, [open, editStore, reset])

  const handleFormSubmit = (data: StoreFormData) => {
    const submitData: StoreInput = {
      name: data.name,
      address: data.address,
      PaymentType: data.PaymentType,
      managerName: data.PaymentType === "ACCOUNT" ? data.managerName : null,
      items: data.items?.filter((item) => item.name.trim() !== "") ?? [],
    }
    onSubmit(submitData)
  }

  // SaleItem 선택 핸들러
  const handleSaleItemSelect = (index: number, saleItem: SaleItem) => {
    setValue(`items.${index}.name`, saleItem.name, { shouldValidate: true })
    setValue(`items.${index}.unitPrice`, saleItem.unitPrice, { shouldValidate: true })
    setValue(`items.${index}.quantity`, 1, { shouldValidate: true })
    setItemSearchTerms((prev) => ({ ...prev, [index]: saleItem.name }))
    setShowDropdown((prev) => ({ ...prev, [index]: false }))
  }

  const handleAddItem = () => {
    append({ name: "", unitPrice: 0, quantity: 0 })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "매장 정보 수정" : "매장 추가"}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex-1 overflow-y-auto space-y-4 px-1"
        >
          {/* 매장명 */}
          <div className="space-y-2">
            <Label htmlFor="name">매장명</Label>
            <Input
              id="name"
              placeholder="예: 서울 편의점"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* 주소 */}
          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              placeholder="예: 서울시 강남구 테헤란로 123"
              {...register("address")}
              aria-invalid={!!errors.address}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>

          {/* 결제방식 */}
          <div className="space-y-2">
            <Label htmlFor="PaymentType">결제방식</Label>
            <Select
              value={paymentType}
              onValueChange={(value) =>
                setValue("PaymentType", value as "CASH" | "ACCOUNT" | "CARD")
              }
            >
              <SelectTrigger id="PaymentType">
                <SelectValue placeholder="결제방식 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCOUNT">계좌</SelectItem>
                <SelectItem value="CARD">카드</SelectItem>
                <SelectItem value="CASH">현금</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 담당자 (계좌일 때만) */}
          {paymentType === "ACCOUNT" && (
            <div className="space-y-2">
              <Label htmlFor="managerName">담당자 (입금자)</Label>
              <Input
                id="managerName"
                placeholder="예: 김철수"
                {...register("managerName")}
              />
            </div>
          )}

          {/* 품목 섹션 */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label>매장 기본 품목</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
              >
                <Plus className="size-4" />
                품목 추가
              </Button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-gray-50 rounded-lg p-3 space-y-3"
                >
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
                          setShowDropdown((prev) => ({ ...prev, [index]: true }))
                        }}
                        onFocus={() => setShowDropdown((prev) => ({ ...prev, [index]: true }))}
                        onBlur={() => {
                          // 드롭다운 클릭 이벤트가 먼저 처리되도록 지연
                          if (dropdownTimeoutRef.current[index]) {
                            clearTimeout(dropdownTimeoutRef.current[index])
                          }
                          dropdownTimeoutRef.current[index] = setTimeout(() => {
                            setShowDropdown((prev) => ({ ...prev, [index]: false }))
                          }, 200)
                        }}
                        className="mt-1"
                      />

                      {/* Autocomplete 드롭다운 */}
                      {showDropdown[index] && (itemSearchTerms[index] ?? "").length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                          {saleItems
                            .filter((item) =>
                              item.name.toLowerCase().includes((itemSearchTerms[index] ?? "").toLowerCase())
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
                                <p className="text-xs text-gray-500">{item.unitPrice.toLocaleString()}원</p>
                              </button>
                            ))}
                          {saleItems.filter((item) =>
                            item.name.toLowerCase().includes((itemSearchTerms[index] ?? "").toLowerCase())
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
                        min={1}
                        placeholder="0"
                        {...register(`items.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        className="mt-1"
                      />
                      {errors.items?.[index]?.unitPrice && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.items[index]?.unitPrice?.message}
                        </p>
                      )}
                    </div>

                    {/* 기본 수량 */}
                    <div className="col-span-3">
                      <Label className="text-xs text-gray-600">기본 수량</Label>
                      <Input
                        type="number"
                        min={1}
                        placeholder="0"
                        {...register(`items.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="mt-1"
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
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-6"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  품목을 추가해주세요
                </div>
              )}
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
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
