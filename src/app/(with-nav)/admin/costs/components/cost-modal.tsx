"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { AmountInput } from "@/components/common"
import { useCreateCost, useUpdateCost, type CostRecord } from "../hooks/use-costs"

const costFormSchema = z.object({
  date: z.string().min(1, "날짜를 입력해주세요"),
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  amount: z.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  description: z.string().trim().optional(),
})

type CostFormData = z.infer<typeof costFormSchema>

interface CostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCost: CostRecord | null
}

export function CostModal({ open, onOpenChange, editingCost }: CostModalProps) {
  const createMutation = useCreateCost()
  const updateMutation = useUpdateCost()
  const isEditing = !!editingCost

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<CostFormData>({
    resolver: zodResolver(costFormSchema),
    mode: "onChange",
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      title: "",
      amount: 0,
      description: "",
    },
  })

  // 수정 모드 시 기존 값 세팅
  useEffect(() => {
    if (open && editingCost) {
      reset({
        date: editingCost.date,
        title: editingCost.title,
        amount: editingCost.amount,
        description: editingCost.description ?? "",
      })
    } else if (open && !editingCost) {
      reset({
        date: new Date().toISOString().split("T")[0],
        title: "",
        amount: 0,
        description: "",
      })
    }
  }, [open, editingCost, reset])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    onOpenChange(newOpen)
  }

  const onSubmit = (data: CostFormData) => {
    const payload = { ...data, amount: Number(data.amount) }
    if (isEditing) {
      updateMutation.mutate(
        { id: editingCost.id, ...payload },
        { onSuccess: () => handleOpenChange(false) }
      )
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => handleOpenChange(false),
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isEditing ? "비용 수정" : "비용 추가"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isEditing ? "비용 정보를 수정하세요" : "새로운 비용을 등록하세요"}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
            <div className="space-y-2">
              <Label htmlFor="cost-date">날짜</Label>
              <Input
                id="cost-date"
                type="date"
                {...register("date")}
                aria-invalid={!!errors.date}
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-title">제목</Label>
              <Input
                id="cost-title"
                placeholder="예: 차량 유류비"
                {...register("title")}
                aria-invalid={!!errors.title}
                autoFocus
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-amount">금액 (원)</Label>
              <Controller
                control={control}
                name="amount"
                render={({ field }) => (
                  <AmountInput
                    id="cost-amount"
                    placeholder="0"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.amount}
                  />
                )}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost-description">비고</Label>
              <Textarea
                id="cost-description"
                placeholder="메모 (선택)"
                rows={3}
                {...register("description")}
              />
            </div>
          </div>

          <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending
                ? isEditing
                  ? "수정 중..."
                  : "추가 중..."
                : isEditing
                  ? "수정"
                  : "추가"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
