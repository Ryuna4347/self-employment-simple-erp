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
import type { StoreFormData } from "./store-modal"

interface StoreItemsSectionProps {
  fields: FieldArrayWithId<StoreFormData, "items", "id">[]
  register: UseFormRegister<StoreFormData>
  control: Control<StoreFormData>
  errors: FieldErrors<StoreFormData>
  onAdd: () => void
  onRemove: (index: number) => void
}

/**
 * 매장 모달의 기본 품목 섹션 (동적 배열)
 * work-record 품목 섹션과 유사하지만 스키마/라벨이 달라 공용화하지 않는다
 * (rhf Control<T> 불변성 때문에 제네릭 공유 시 any 캐스팅이 강제됨).
 */
export function StoreItemsSection({
  fields,
  register,
  control,
  errors,
  onAdd,
  onRemove,
}: StoreItemsSectionProps) {
  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <Label>매장 기본 품목</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="size-4" />
          품목 추가
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="bg-gray-50 rounded-lg p-3 space-y-3">
            <div className="grid grid-cols-12 gap-2 items-start">
              <div className="col-span-5">
                <Label className="text-xs text-gray-600">품목명</Label>
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

              <div className="col-span-3">
                <Label className="text-xs text-gray-600">기본 수량</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="0"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  className="mt-1"
                />
                {errors.items?.[index]?.quantity && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.items[index]?.quantity?.message}
                  </p>
                )}
              </div>

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
                    />
                  )}
                />
                {errors.items?.[index]?.amount && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.items[index]?.amount?.message}
                  </p>
                )}
              </div>

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
    </div>
  )
}
