"use client"

import { Controller } from "react-hook-form"
import type {
  Control,
  FieldArrayWithId,
  FieldErrors,
  UseFormRegister,
} from "react-hook-form"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/common"
import type { WorkRecordFormData } from "./work-record-modal"

interface WorkRecordItemsSectionProps {
  fields: FieldArrayWithId<WorkRecordFormData, "items", "id">[]
  register: UseFormRegister<WorkRecordFormData>
  control: Control<WorkRecordFormData>
  errors: FieldErrors<WorkRecordFormData>
  onAdd: () => void
  onRemove: (index: number) => void
  totalAmount: number
}

/**
 * 근무기록 모달의 거래 품목 섹션 (동적 배열 + 총 금액)
 * useFieldArray 산출물(fields/register/control)은 안정 참조라 그대로 props로 받는다.
 */
export function WorkRecordItemsSection({
  fields,
  register,
  control,
  errors,
  onAdd,
  onRemove,
  totalAmount,
}: WorkRecordItemsSectionProps) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <Label>거래 품목</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
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
                <Controller
                  control={control}
                  name={`items.${index}.amount`}
                  render={({ field }) => (
                    <AmountInput
                      placeholder="0"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      className="mt-1"
                      aria-invalid={!!errors.items?.[index]?.amount}
                    />
                  )}
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
                  onClick={() => onRemove(index)}
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
  )
}
