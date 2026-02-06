"use client"

import { useEffect, useState, useMemo } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus, X, MapPin, Save } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableDropdown, ItemAutocomplete } from "@/components/common"
import { useDropdownState, useIndexedDropdownState } from "@/hooks/use-dropdown-state"
import { useStores, type Store } from "@/app/(with-nav)/stores/hooks/use-stores"
import { useSaleItems } from "@/app/(with-nav)/sale-items/hooks/use-sale-items"
import {
  useCreateWorkRecord,
  useUpdateWorkRecord,
  useSaveStoreFromWorkRecord,
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
  storeId: z.string().optional(),
  storeName: z.string().min(1, "매장명을 입력해주세요"),
  storeAddress: z.string().min(1, "매장 주소를 입력해주세요"),
  paymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
  managerName: z.string().optional(),
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

  // 매장 검색 상태 (공용 Hook 사용)
  const storeDropdown = useDropdownState()

  // 품목 자동완성 상태 (공용 Hook 사용)
  const itemDropdown = useIndexedDropdownState()

  // 데이터 조회
  const { data: stores = [] } = useStores(undefined)
  const { data: saleItems = [] } = useSaleItems(undefined, { enabled: open })

  // Mutations
  const createMutation = useCreateWorkRecord()
  const updateMutation = useUpdateWorkRecord()
  const saveStoreMutation = useSaveStoreFromWorkRecord()
  const isLoading = createMutation.isPending || updateMutation.isPending || saveStoreMutation.isPending

  // 매장 검색 필터링
  const filteredStores = useMemo(() => {
    if (!storeDropdown.searchTerm) return stores.slice(0, 10)
    return stores
      .filter(
        (store) =>
          store.name.toLowerCase().includes(storeDropdown.searchTerm.toLowerCase()) ||
          store.address.toLowerCase().includes(storeDropdown.searchTerm.toLowerCase())
      )
      .slice(0, 10)
  }, [stores, storeDropdown.searchTerm])

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<WorkRecordFormData>({
    resolver: zodResolver(workRecordFormSchema),
    mode: "onChange",
    defaultValues: {
      storeId: "",
      storeName: "",
      storeAddress: "",
      paymentType: "CASH",
      managerName: "",
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
  const paymentType = watch("paymentType")
  const storeId = watch("storeId")

  // useWatch는 값 변경 시 리렌더링을 트리거
  const watchedItems = useWatch({ control, name: "items" })

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setInternalEditRecord(editRecord ?? null)
      storeDropdown.reset()
      itemDropdown.reset()

      if (editRecord) {
        // 수정 모드: 기존 데이터로 초기화
        const initialSearchTerms: Record<number, string> = {}
        editRecord.items.forEach((item, index) => {
          initialSearchTerms[index] = item.name
        })
        itemDropdown.reset(initialSearchTerms)

        reset({
          storeId: editRecord.storeId ?? "",
          storeName: editRecord.storeNameSnapshot ?? editRecord.store?.name ?? "",
          storeAddress: editRecord.storeAddressSnapshot ?? editRecord.store?.address ?? "",
          paymentType: editRecord.paymentTypeSnapshot,
          managerName: editRecord.managerNameSnapshot ?? editRecord.store?.managerName ?? "",
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
        reset({
          storeId: "",
          storeName: "",
          storeAddress: "",
          paymentType: "CASH",
          managerName: "",
          isCollected: false,
          note: "",
          items: [],
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dropdown reset은 open 변경 시에만 필요
  }, [open, editRecord, reset])

  // 매장 선택 핸들러
  const handleStoreSelect = (store: Store) => {
    // 폼 필드 자동 채움
    setValue("storeId", store.id)
    setValue("storeName", store.name)
    setValue("storeAddress", store.address)
    setValue("paymentType", store.PaymentType)
    setValue("managerName", store.managerName ?? "")
    storeDropdown.setSearchTerm(store.name)
    storeDropdown.setShowDropdown(false)

    // 매장 기본 품목 로드 (추가 모드에서만)
    if (!isEditMode && store.storeItems.length > 0) {
      const newItems = store.storeItems.map((item) => ({
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      }))
      setValue("items", newItems)

      // 검색어 상태도 동기화
      const newSearchTerms: Record<number, string> = {}
      store.storeItems.forEach((item, index) => {
        newSearchTerms[index] = item.name
      })
      itemDropdown.reset(newSearchTerms)
    }

    trigger()
  }

  // 매장명/주소 변경 시 storeId 연결 해제
  const handleStoreFieldChange = (field: "storeName" | "storeAddress", value: string) => {
    setValue(field, value, { shouldValidate: true })
    if (storeId) {
      setValue("storeId", "", { shouldValidate: true })
    }
  }

  // 품목 선택 핸들러
  const handleSaleItemSelect = (index: number, saleItem: { id: string; name: string; unitPrice: number }) => {
    setValue(`items.${index}.name`, saleItem.name, { shouldValidate: true })
    setValue(`items.${index}.unitPrice`, saleItem.unitPrice, { shouldValidate: true })
    itemDropdown.setSearchTerm(index, saleItem.name)
    itemDropdown.closeDropdown(index)
  }

  // 품목 추가 핸들러
  const handleAddItem = () => {
    append({ name: "", unitPrice: 0, quantity: 1 })
  }

  // 품목 삭제 핸들러
  const handleRemoveItem = (index: number) => {
    remove(index)
    itemDropdown.reindexAfterRemove(index)
  }

  // 총 금액 계산
  const totalAmount = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (item.unitPrice ?? 0) * (item.quantity ?? 0)
  }, 0)

  // 매장 저장 핸들러 (수정 모달에서 사용)
  const handleSaveStore = () => {
    if (!internalEditRecord) return
    saveStoreMutation.mutate(internalEditRecord.id)
  }

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
        { onSuccess: () => onOpenChange(false) }
      )
    } else {
      createMutation.mutate(
        {
          date: dateStr,
          storeId: data.storeId || undefined,
          storeName: data.storeName,
          storeAddress: data.storeAddress,
          paymentType: data.paymentType,
          managerName: data.managerName,
          isCollected: data.isCollected,
          note: data.note,
          items: data.items,
        },
        { onSuccess: () => onOpenChange(false) }
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
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* 방문 일자 (읽기 전용) */}
          <div className="space-y-2">
            <Label>방문 일자</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
              {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
            </div>
          </div>

          {/* 매장 검색 (추가 모드에서만) */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label htmlFor="storeSearch">매장 검색 (선택사항)</Label>
              <SearchableDropdown
                id="storeSearch"
                searchTerm={storeDropdown.searchTerm}
                onSearchChange={storeDropdown.handleSearchChange}
                showDropdown={storeDropdown.showDropdown}
                onFocus={() => storeDropdown.setShowDropdown(true)}
                onBlur={storeDropdown.handleBlur}
                items={filteredStores}
                getItemKey={(store) => store.id}
                renderItem={(store) => (
                  <>
                    <p className="text-sm font-medium text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="size-3" />
                      {store.address}
                    </p>
                  </>
                )}
                onItemSelect={handleStoreSelect}
                placeholder="기존 매장을 검색하여 자동 입력..."
                emptyMessage="검색 결과가 없습니다"
              />
            </div>
          )}

          {/* 매장 정보 섹션 */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">매장 정보</Label>
              {isEditMode && !internalEditRecord?.storeId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSaveStore}
                  disabled={saveStoreMutation.isPending}
                >
                  <Save className="size-4 mr-1" />
                  {saveStoreMutation.isPending ? "저장 중..." : "매장으로 저장"}
                </Button>
              )}
            </div>

            {/* 수정 모드: 읽기 전용 */}
            {isEditMode ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">매장명</span>
                  <span className="font-medium">{watch("storeName")}</span>
                </div>
                {watch("storeAddress") && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">주소</span>
                    <span className="font-medium">{watch("storeAddress")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">결제방식</span>
                  <span className="font-medium">{formatPaymentType(watch("paymentType"))}</span>
                </div>
                {watch("managerName") && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">담당자</span>
                    <span className="font-medium">{watch("managerName")}</span>
                  </div>
                )}
                {!internalEditRecord?.storeId && (
                  <p className="text-xs text-amber-600 mt-2">
                    ※ 이 매장은 아직 DB에 저장되지 않았습니다.
                  </p>
                )}
              </div>
            ) : (
              /* 추가 모드: 입력 가능 */
              <div className="space-y-3">
                {/* 매장명 */}
                <div className="space-y-1">
                  <Label htmlFor="storeName" className="text-sm">
                    매장명 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="storeName"
                    placeholder="매장명을 입력하세요"
                    value={watch("storeName")}
                    onChange={(e) => handleStoreFieldChange("storeName", e.target.value)}
                    aria-invalid={!!errors.storeName}
                  />
                  {errors.storeName && (
                    <p className="text-xs text-red-500">{errors.storeName.message}</p>
                  )}
                </div>

                {/* 주소 */}
                <div className="space-y-1">
                  <Label htmlFor="storeAddress" className="text-sm">
                    주소 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="storeAddress"
                    placeholder="주소를 입력하세요"
                    value={watch("storeAddress") ?? ""}
                    onChange={(e) => handleStoreFieldChange("storeAddress", e.target.value)}
                    aria-invalid={!!errors.storeAddress}
                  />
                  {errors.storeAddress && (
                    <p className="text-xs text-red-500">{errors.storeAddress.message}</p>
                  )}
                </div>

                {/* 결제방식 */}
                <div className="space-y-1">
                  <Label htmlFor="paymentType" className="text-sm">
                    결제방식 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={paymentType}
                    onValueChange={(value) =>
                      setValue("paymentType", value as "CASH" | "ACCOUNT" | "CARD", {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="paymentType">
                      <SelectValue placeholder="결제방식 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">현금</SelectItem>
                      <SelectItem value="ACCOUNT">계좌이체</SelectItem>
                      <SelectItem value="CARD">카드</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 담당자 (계좌이체일 때만) */}
                {paymentType === "ACCOUNT" && (
                  <div className="space-y-1">
                    <Label htmlFor="managerName" className="text-sm">담당자</Label>
                    <Input
                      id="managerName"
                      placeholder="담당자명을 입력하세요"
                      {...register("managerName")}
                    />
                  </div>
                )}

                {/* 연결된 매장 표시 */}
                {storeId && (
                  <p className="text-xs text-green-600">
                    ✓ 기존 매장과 연결됨
                  </p>
                )}
              </div>
            )}
          </div>

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
                      <div className="col-span-5">
                        <ItemAutocomplete
                          searchTerm={itemDropdown.getSearchTerm(index)}
                          onSearchChange={(value) => {
                            itemDropdown.handleSearchChange(index, value)
                            setValue(`items.${index}.name`, value, { shouldValidate: true })
                          }}
                          showDropdown={itemDropdown.isDropdownOpen(index)}
                          onFocus={() => itemDropdown.openDropdown(index)}
                          onBlur={() => itemDropdown.handleBlur(index)}
                          items={saleItems}
                          onItemSelect={(item) => handleSaleItemSelect(index, item)}
                          error={errors.items?.[index]?.name?.message}
                          label="품명"
                          placeholder="품목 검색..."
                        />
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
