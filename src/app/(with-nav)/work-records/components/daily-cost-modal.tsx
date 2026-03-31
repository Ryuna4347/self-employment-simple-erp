"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
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
import { Label } from "@/components/ui/label"
import { useUpsertDailyCost } from "../hooks/use-daily-cost"

const dailyCostFormSchema = z.object({
  amount: z.number().int().min(1, "금액은 1원 이상이어야 합니다"),
})

type DailyCostFormData = z.infer<typeof dailyCostFormSchema>

interface DailyCostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string
  title: string
  currentAmount: number | null
}

export function DailyCostModal({ open, onOpenChange, date, title, currentAmount }: DailyCostModalProps) {
  const upsertMutation = useUpsertDailyCost()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<DailyCostFormData>({
    resolver: zodResolver(dailyCostFormSchema),
    mode: "onChange",
    defaultValues: { amount: 0 },
  })

  // 모달 열릴 때 기존 값 세팅
  useEffect(() => {
    if (open) {
      reset({ amount: currentAmount ?? 0 })
    }
  }, [open, currentAmount, reset])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    onOpenChange(newOpen)
  }

  const onSubmit = (data: DailyCostFormData) => {
    upsertMutation.mutate(
      { date, title, amount: Number(data.amount) },
      { onSuccess: () => handleOpenChange(false) }
    )
  }

  const isPending = upsertMutation.isPending

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {currentAmount != null ? `${title} 수정` : `${title} 입력`}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {date} {title}를 입력하세요
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
            <div className="space-y-2">
              <Label htmlFor="daily-cost-amount">금액 (원)</Label>
              <Input
                id="daily-cost-amount"
                type="number"
                inputMode="numeric"
                placeholder="0"
                {...register("amount", { valueAsNumber: true })}
                aria-invalid={!!errors.amount}
                autoFocus
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
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
              {isPending ? "저장 중..." : "저장"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
