"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import type { SaleItem } from "../hooks/use-sale-items"

// 유효성 검사 스키마
const saleItemSchema = z.object({
  name: z.string().min(1, "물품명을 입력해주세요"),
  unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다"),
})

type SaleItemFormData = z.infer<typeof saleItemSchema>

interface SaleItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: SaleItemFormData) => void
  editItem?: SaleItem | null
  isLoading?: boolean
}

/**
 * 물품 추가/수정 모달
 */
export function SaleItemModal({
  open,
  onOpenChange,
  onSubmit,
  editItem,
  isLoading,
}: SaleItemModalProps) {
  // 내부 상태로 수정 모드 유지 (닫힘 애니메이션 중 라벨 변경 방지)
  const [internalEditItem, setInternalEditItem] = useState<SaleItem | null>(null)
  const isEditMode = !!internalEditItem

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SaleItemFormData>({
    resolver: zodResolver(saleItemSchema),
    defaultValues: {
      name: "",
      unitPrice: 0,
    },
  })

  // 모달 열릴 때만 외부 editItem을 내부 상태로 동기화
  useEffect(() => {
    if (open) {
      setInternalEditItem(editItem ?? null)
      if (editItem) {
        reset({
          name: editItem.name,
          unitPrice: editItem.unitPrice,
        })
      } else {
        reset({
          name: "",
          unitPrice: 0,
        })
      }
    }
  }, [open, editItem, reset])

  const handleFormSubmit = (data: SaleItemFormData) => {
    onSubmit(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "물품 정보 수정" : "물품 추가"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 px-1">
          {/* 물품명 */}
          <div className="space-y-2">
            <Label htmlFor="name">물품명 (규격 포함)</Label>
            <Input
              id="name"
              placeholder="예: 생수 2L, 커피믹스 100T"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* 단가 */}
          <div className="space-y-2">
            <Label htmlFor="unitPrice">표준 단가 (원)</Label>
            <Input
              id="unitPrice"
              type="number"
              min={0}
              placeholder="예: 1000"
              {...register("unitPrice", { valueAsNumber: true })}
              aria-invalid={!!errors.unitPrice}
            />
            {errors.unitPrice && (
              <p className="text-sm text-red-500">{errors.unitPrice.message}</p>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "처리 중..." : isEditMode ? "수정 완료" : "등록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
