"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { Plus, X, MapPin, Save, ImagePlus, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchableDropdown } from "@/components/common"
import { useDropdownState } from "@/hooks/use-dropdown-state"
import { useStores, type Store } from "@/app/(with-nav)/stores/hooks/use-stores"
import type { Role } from "@/generated/prisma/client"
import {
  useCreateWorkRecord,
  useUpdateWorkRecord,
  useSaveStoreFromWorkRecord,
  type WorkRecordResponse,
  type CollectionStatus,
} from "../hooks/use-work-records"

// 품목 스키마
const recordItemSchema = z.object({
  name: z.string().min(1, "품명을 입력해주세요"),
  amount: z.number().int().min(0, "금액을 입력해주세요"),
  quantity: z.number().int().min(1, "수량을 입력해주세요"),
})

// 근무기록 폼 스키마
const workRecordFormSchema = z.object({
  storeId: z.string().optional(),
  storeName: z.string().min(1, "매장명을 입력해주세요"),
  storeAddress: z.string().min(1, "매장 주소를 입력해주세요"),
  paymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
  managerName: z.string().optional(),
  collectionStatus: z.enum(["UNCOLLECTED", "COLLECTED", "CLOSED"]),
  note: z.string().optional(),
  items: z.array(recordItemSchema),
}).refine(
  (data) => {
    if (data.collectionStatus === "CLOSED") return true
    return data.items.length >= 1
  },
  { message: "최소 1개 품목이 필요합니다", path: ["items"] }
)

type WorkRecordFormData = z.infer<typeof workRecordFormSchema>

interface WorkRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  editRecord?: WorkRecordResponse | null
  userRole: Role
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
  userRole,
}: WorkRecordModalProps) {
  // 수정 모드 확인 (애니메이션 중 라벨 변경 방지)
  const [internalEditRecord, setInternalEditRecord] = useState<WorkRecordResponse | null>(null)
  const isEditMode = !!internalEditRecord

  // 이미지 업로드 상태
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 매장 검색 상태 (공용 Hook 사용)
  const storeDropdown = useDropdownState()

  // 데이터 조회
  const { data: stores = [] } = useStores(undefined)

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
      collectionStatus: "UNCOLLECTED",
      note: "",
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const collectionStatus = watch("collectionStatus")
  const paymentType = watch("paymentType")
  const storeId = watch("storeId")
  const isClosed = collectionStatus === "CLOSED"

  // useWatch는 값 변경 시 리렌더링을 트리거
  const watchedItems = useWatch({ control, name: "items" })

  // 모달 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setInternalEditRecord(editRecord ?? null)
      storeDropdown.reset()
      setImageFile(null)

      if (editRecord) {
        // 수정 모드: 기존 데이터로 초기화
        reset({
          storeId: editRecord.storeId ?? "",
          storeName: editRecord.storeNameSnapshot ?? editRecord.store?.name ?? "",
          storeAddress: editRecord.storeAddressSnapshot ?? editRecord.store?.address ?? "",
          paymentType: editRecord.paymentTypeSnapshot,
          managerName: editRecord.managerNameSnapshot ?? editRecord.store?.managerName ?? "",
          collectionStatus: editRecord.collectionStatus,
          note: editRecord.note ?? "",
          items: editRecord.items.map((item) => ({
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
          })),
        })
        setImagePreview(editRecord.imageUrl ?? null)
      } else {
        // 추가 모드: 빈 값으로 초기화
        reset({
          storeId: "",
          storeName: "",
          storeAddress: "",
          paymentType: "CASH",
          managerName: "",
          collectionStatus: "UNCOLLECTED",
          note: "",
          items: [],
        })
        setImagePreview(null)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dropdown reset은 open 변경 시에만 필요
  }, [open, editRecord, reset])

  // 휴업&폐업 선택 시 품목 초기화, 해제 시 이미지 초기화
  useEffect(() => {
    if (isClosed && fields.length > 0) {
      setValue("items", [], { shouldValidate: true })
    }
    if (!isClosed) {
      setImageFile(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }, [isClosed, fields.length, setValue])

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

    // 매장 기본 품목 로드 (추가 모드에서만, 휴업&폐업이 아닐 때)
    if (!isEditMode && !isClosed && store.storeItems.length > 0) {
      const newItems = store.storeItems.map((item) => ({
        name: item.name,
        amount: item.amount,
        quantity: item.quantity,
      }))
      setValue("items", newItems)
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

  // 품목 추가 핸들러
  const handleAddItem = () => {
    append({ name: "", amount: 0, quantity: 1 })
  }

  // 품목 삭제 핸들러
  const handleRemoveItem = (index: number) => {
    remove(index)
  }

  // 총 금액 계산
  const totalAmount = (watchedItems ?? []).reduce((sum, item) => {
    return sum + (item.amount ?? 0)
  }, 0)

  // 매장 저장 핸들러 (수정 모달에서 사용)
  const handleSaveStore = () => {
    if (!internalEditRecord) return
    saveStoreMutation.mutate(internalEditRecord.id)
  }

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 5MB 제한
    if (file.size > 5 * 1024 * 1024) {
      alert("파일 크기는 5MB 이하여야 합니다")
      return
    }

    // 타입 제한
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPEG, PNG, WebP 이미지만 업로드할 수 있습니다")
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  // 이미지 삭제 핸들러
  const handleImageRemove = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // 이미지 업로드
  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null

    const formData = new FormData()
    formData.append("file", imageFile)

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("이미지 업로드에 실패했습니다")
    }

    const data = await response.json()
    return data.data.url
  }

  // 폼 제출 핸들러
  const handleFormSubmit = async (data: WorkRecordFormData) => {
    const dateStr = format(selectedDate, "yyyy-MM-dd")

    try {
      setIsUploading(true)

      // 이미지 업로드
      let imageUrl: string | null | undefined
      if (imageFile) {
        imageUrl = await uploadImage()
      } else if (imagePreview === null && internalEditRecord?.imageUrl) {
        // 기존 이미지 삭제
        imageUrl = null
      }

      if (isEditMode && internalEditRecord) {
        updateMutation.mutate(
          {
            id: internalEditRecord.id,
            collectionStatus: data.collectionStatus as CollectionStatus,
            note: data.note,
            items: isClosed ? [] : data.items,
            ...(imageUrl !== undefined && { imageUrl }),
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
            collectionStatus: data.collectionStatus as CollectionStatus,
            note: data.note,
            items: isClosed ? [] : data.items,
            ...(imageUrl && { imageUrl }),
          },
          { onSuccess: () => onOpenChange(false) }
        )
      }
    } catch {
      alert("이미지 업로드에 실패했습니다")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent
        className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isEditMode ? "근무기록 수정" : "근무기록 추가"}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
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
              value={collectionStatus}
              onValueChange={(value) =>
                setValue("collectionStatus", value as CollectionStatus, { shouldValidate: true })
              }
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="UNCOLLECTED" id="uncollected" />
                <Label htmlFor="uncollected" className="font-normal cursor-pointer">
                  미수
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="COLLECTED"
                  id="collected"
                  disabled={userRole !== "ADMIN" && !!internalEditRecord?.hasPreviousUncollected}
                />
                <Label
                  htmlFor="collected"
                  className={`font-normal ${userRole !== "ADMIN" && internalEditRecord?.hasPreviousUncollected ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer"}`}
                >
                  수금 완료
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="CLOSED" id="closed" />
                <Label htmlFor="closed" className="font-normal cursor-pointer">
                  휴업&폐업
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 품목 섹션 (휴업&폐업이 아닐 때만) */}
          {isClosed ? (
            <div className="border-t border-gray-200 pt-4">
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg">
                휴업&폐업 상태에서는 거래 품목이 없습니다
              </div>
            </div>
          ) : (
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
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      {/* 품명 */}
                      <div className="col-span-5">
                        <Label className="text-xs text-gray-600">품명</Label>
                        <Input
                          placeholder="품목명 입력"
                          {...register(`items.${index}.name`)}
                          className="mt-1"
                          aria-invalid={!!errors.items?.[index]?.name}
                        />
                        {errors.items?.[index]?.name && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.name?.message}
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

                      {/* 금액 */}
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">금액</Label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...register(`items.${index}.amount`, {
                            valueAsNumber: true,
                          })}
                          className="mt-1"
                          aria-invalid={!!errors.items?.[index]?.amount}
                        />
                        {errors.items?.[index]?.amount && (
                          <p className="text-xs text-red-500 mt-1">
                            {errors.items[index]?.amount?.message}
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
                  </div>
                ))}

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
          )}

          {/* 이미지 업로드 (휴업&폐업일 때만) */}
          {isClosed && (
            <div className="space-y-2">
              <Label>이미지 첨부</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="첨부 이미지"
                    className="w-full max-h-48 object-contain rounded-lg border border-gray-200"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    onClick={handleImageRemove}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                >
                  <ImagePlus className="size-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">클릭하여 이미지 첨부</p>
                  <p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP / 최대 5MB</p>
                </button>
              )}
            </div>
          )}

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

          <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading || isUploading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading || isUploading || !isValid}>
              {isLoading || isUploading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
