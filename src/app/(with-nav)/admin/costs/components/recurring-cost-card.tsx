"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Pencil, Trash2 } from "lucide-react"
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
import {
  useCreateRecurringCost,
  useUpdateRecurringCost,
  useDeleteRecurringCost,
  type RecurringCostRecord,
} from "../hooks/use-recurring-costs"

const recurringCostFormSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").trim(),
  amount: z.number().int().min(1, "금액은 1원 이상이어야 합니다"),
  frequency: z.enum(["WEEKLY", "MONTHLY"], "주기를 선택해주세요"),
})

type RecurringCostFormData = z.infer<typeof recurringCostFormSchema>

const FREQUENCY_LABELS: Record<string, string> = {
  WEEKLY: "매주 월요일",
  MONTHLY: "매월 1일",
}

interface RecurringCostCardProps {
  mode: "view" | "edit" | "create"
  cost?: RecurringCostRecord
  onCancel: () => void
  onSaved: () => void
  onEditRequest: () => void
}

export function RecurringCostCard({
  mode,
  cost,
  onCancel,
  onSaved,
  onEditRequest,
}: RecurringCostCardProps) {
  const createMutation = useCreateRecurringCost()
  const updateMutation = useUpdateRecurringCost()
  const deleteMutation = useDeleteRecurringCost()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<RecurringCostFormData>({
    resolver: zodResolver(recurringCostFormSchema),
    mode: "onChange",
    defaultValues: {
      name: cost?.name ?? "",
      amount: cost?.amount ?? 0,
      frequency: cost?.frequency ?? "MONTHLY",
    },
  })

  const frequency = watch("frequency")

  // 편집 모드 진입 시 기존 값 세팅
  useEffect(() => {
    if (mode === "edit" && cost) {
      reset({
        name: cost.name,
        amount: cost.amount,
        frequency: cost.frequency,
      })
    } else if (mode === "create") {
      reset({ name: "", amount: 0, frequency: "MONTHLY" })
    }
  }, [mode, cost, reset])

  const onSubmit = (data: RecurringCostFormData) => {
    const payload = { ...data, amount: Number(data.amount) }
    if (mode === "edit" && cost) {
      updateMutation.mutate(
        { id: cost.id, ...payload },
        { onSuccess: () => onSaved() }
      )
    } else if (mode === "create") {
      createMutation.mutate(payload, {
        onSuccess: () => onSaved(),
      })
    }
  }

  const handleDelete = () => {
    if (!cost) return
    if (!window.confirm(`"${cost.name}" 고정비용을 삭제하시겠습니까?`)) return
    deleteMutation.mutate(cost.id, { onSuccess: () => onSaved() })
  }

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  // 뷰 모드
  if (mode === "view" && cost) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{cost.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-orange-600">
                {cost.amount.toLocaleString()}원
              </span>
              <span className="text-xs text-gray-500">
                {FREQUENCY_LABELS[cost.frequency]}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEditRequest}
              disabled={isPending}
            >
              <Pencil className="size-3.5 text-gray-400" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="size-3.5 text-gray-400" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // 편집/생성 모드
  return (
    <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`rc-name-${cost?.id ?? "new"}`}>이름</Label>
          <Input
            id={`rc-name-${cost?.id ?? "new"}`}
            placeholder="예: 임대료, 인터넷 요금"
            {...register("name")}
            aria-invalid={!!errors.name}
            autoFocus={mode === "create"}
          />
          {errors.name && (
            <p className="text-xs text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`rc-amount-${cost?.id ?? "new"}`}>금액 (원)</Label>
          <Input
            id={`rc-amount-${cost?.id ?? "new"}`}
            type="number"
            inputMode="numeric"
            placeholder="0"
            {...register("amount", { valueAsNumber: true })}
            aria-invalid={!!errors.amount}
          />
          {errors.amount && (
            <p className="text-xs text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>주기</Label>
          <Select
            value={frequency}
            onValueChange={(v) =>
              setValue("frequency", v as "WEEKLY" | "MONTHLY", {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">매월 1일</SelectItem>
              <SelectItem value="WEEKLY">매주 월요일</SelectItem>
            </SelectContent>
          </Select>
          {errors.frequency && (
            <p className="text-xs text-red-500">{errors.frequency.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isPending}
          >
            취소
          </Button>
          <Button type="submit" size="sm" disabled={!isValid || isPending}>
            {isPending
              ? mode === "edit"
                ? "저장 중..."
                : "생성 중..."
              : mode === "edit"
                ? "저장"
                : "생성"}
          </Button>
        </div>
      </form>
    </div>
  )
}
