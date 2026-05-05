"use client"

import { useEffect, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, X } from "lucide-react"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useStoreTemplates } from "@/app/(with-nav)/store-templates/hooks/use-store-templates"
import { useUser } from "@/components/providers/app-providers"
import { useUsers } from "@/hooks/use-users"
import { TaxPartyAutocomplete, type TaxPartyOption } from "./tax-party-autocomplete"

// 품목 스키마
const storeItemSchema = z.object({
  name: z.string().min(1, "품명을 입력해주세요"),
  amount: z.number().int().min(0, "금액을 입력해주세요"),
  quantity: z.number().int().min(1, "수량을 입력해주세요"),
})

const storeSchema = z.object({
  name: z.string().min(1, "매장명을 입력해주세요"),
  address: z.string().min(1, "주소를 입력해주세요"),
  PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
  receiptType: z.enum(["NONE", "SIMPLE_RECEIPT", "TRANSACTION_STATEMENT"]),
  managerName: z.string().optional(),
  assignedUserId: z.string().optional(),
  note: z.string().optional(),
  taxPartyId: z.string().nullable().optional(),
  taxInvoiceEnabled: z.boolean().optional(),
  items: z.array(storeItemSchema).optional(),
}).refine(
  (data) => data.PaymentType !== "ACCOUNT" || !!data.managerName?.trim(),
  { message: "계좌이체 결제 시 입금자를 입력해주세요", path: ["managerName"] }
)

type StoreFormData = z.infer<typeof storeSchema>

function isPaymentType(value: string): value is StoreFormData["PaymentType"] {
  return value === "CASH" || value === "ACCOUNT" || value === "CARD"
}

function isReceiptType(value: string): value is StoreFormData["receiptType"] {
  return value === "NONE" || value === "SIMPLE_RECEIPT" || value === "TRANSACTION_STATEMENT"
}

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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedParty, setSelectedParty] = useState<TaxPartyOption | null>(null)
  const { role } = useUser()
  const isAdmin = role === "ADMIN"
  const { data: templates = [] } = useStoreTemplates()
  const { data: users = [] } = useUsers()

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
      receiptType: "NONE",
      managerName: "",
      assignedUserId: "",
      note: "",
      taxPartyId: null,
      taxInvoiceEnabled: false,
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  })

  const paymentType = watch("PaymentType")
  const taxInvoiceEnabled = watch("taxInvoiceEnabled")
  const showTaxInvoiceCheckbox = paymentType === "CASH" || paymentType === "ACCOUNT"

  // 모달 열릴 때 외부 editStore를 내부 상태로 동기화
  useEffect(() => {
    if (open) {
      setInternalEditStore(editStore ?? null)
      setSelectedTemplateId("")

      if (editStore) {
        setSelectedParty(editStore.taxParty)
        reset({
          name: editStore.name,
          address: editStore.address,
          PaymentType: editStore.PaymentType,
          receiptType: editStore.receiptType ?? "NONE",
          managerName: editStore.managerName ?? "",
          assignedUserId: editStore.assignedUserId ?? "",
          note: editStore.note ?? "",
          taxPartyId: editStore.taxPartyId,
          taxInvoiceEnabled: editStore.taxInvoiceEnabled ?? false,
          items: editStore.storeItems.map((item) => ({
            name: item.name,
            amount: item.amount,
            quantity: item.quantity,
          })),
        })
      } else {
        setSelectedParty(null)
        reset({
          name: "",
          address: "",
          PaymentType: "ACCOUNT",
          receiptType: "NONE",
          managerName: "",
          assignedUserId: "",
          note: "",
          taxPartyId: null,
          taxInvoiceEnabled: false,
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
      receiptType: data.receiptType,
      managerName: data.PaymentType === "ACCOUNT" ? data.managerName : null,
      assignedUserId: data.assignedUserId || null,
      note: data.note || null,
      taxPartyId: isAdmin ? data.taxPartyId ?? null : editStore?.taxPartyId ?? null,
      taxInvoiceEnabled: data.taxInvoiceEnabled ?? false,
      items: data.items?.filter((item) => item.name.trim() !== "") ?? [],
      templateId: selectedTemplateId || null,
    }
    onSubmit(submitData)
  }

  const handleAddItem = () => {
    append({ name: "", amount: 0, quantity: 0 })
  }

  const handleRemoveItem = (index: number) => {
    remove(index)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isEditMode ? "매장 정보 수정" : "매장 추가"}
          </ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
          {/* 매장명 */}
          <div className="space-y-2">
            <Label htmlFor="name">
              매장명 <span className="text-red-500">*</span>
            </Label>
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
            <Label htmlFor="address">
              주소 <span className="text-red-500">*</span>
            </Label>
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

          {/* 결제방식 + 영수증 종류 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="PaymentType">결제방식</Label>
              <Select
                value={paymentType}
                onValueChange={(value) => {
                  if (isPaymentType(value)) setValue("PaymentType", value)
                }}
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

            <div className="space-y-2">
              <Label htmlFor="receiptType">영수증 종류</Label>
              <Select
                value={watch("receiptType")}
                onValueChange={(value) => {
                  if (isReceiptType(value)) setValue("receiptType", value)
                }}
              >
                <SelectTrigger id="receiptType">
                  <SelectValue placeholder="영수증 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">없음</SelectItem>
                  <SelectItem value="SIMPLE_RECEIPT">간이 영수증</SelectItem>
                  <SelectItem value="TRANSACTION_STATEMENT">거래명세서</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 입금자 (계좌일 때만) */}
          {paymentType === "ACCOUNT" && (
            <div className="space-y-2">
              <Label htmlFor="managerName">
                입금자 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="managerName"
                placeholder="예: 김철수"
                {...register("managerName")}
                aria-invalid={!!errors.managerName}
              />
              {errors.managerName && (
                <p className="text-sm text-red-500">{errors.managerName.message}</p>
              )}
            </div>
          )}

          {/* 담당직원 */}
          <div className="space-y-2">
            <Label htmlFor="assignedUserId">담당직원</Label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Select
                  value={watch("assignedUserId") || ""}
                  onValueChange={(value) =>
                    setValue("assignedUserId", value)
                  }
                >
                  <SelectTrigger id="assignedUserId">
                    <SelectValue placeholder="담당직원을 선택하세요 (선택사항)" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {watch("assignedUserId") && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setValue("assignedUserId", "")}
                  className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* 특이사항 */}
          <div className="space-y-2">
            <Label htmlFor="note">특이사항</Label>
            <Input
              id="note"
              placeholder="미수인 경우 '미수 액수'로 입력 (예: 미수 50000)"
              {...register("note")}
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label>사업자 정보</Label>
              <TaxPartyAutocomplete
                value={selectedParty}
                onChange={(party) => {
                  setValue("taxPartyId", party?.id ?? null, { shouldDirty: true })
                  setSelectedParty(party)
                }}
              />
              {selectedParty && (
                <div className="text-sm text-muted-foreground">
                  {selectedParty.name} ({selectedParty.bizNo})
                </div>
              )}
            </div>
          )}

          {showTaxInvoiceCheckbox && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="taxInvoiceEnabled"
                checked={taxInvoiceEnabled}
                onCheckedChange={(value) =>
                  setValue("taxInvoiceEnabled", value === true, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              />
              <Label htmlFor="taxInvoiceEnabled" className="cursor-pointer">
                세금계산서 발급 대상
              </Label>
            </div>
          )}

          {/* 코스 선택 (생성 모드에서만) */}
          {!isEditMode && templates.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="templateId">코스 추가</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger id="templateId">
                      <SelectValue placeholder="코스를 선택하세요 (선택사항)" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} ({template.memberCount}개 매장)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTemplateId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedTemplateId("")}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
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
            <Button type="submit" disabled={isLoading || !isValid}>
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
