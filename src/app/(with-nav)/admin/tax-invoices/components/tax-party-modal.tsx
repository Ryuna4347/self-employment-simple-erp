"use client"

import { useEffect } from "react"
import { Controller, useForm, type UseFormRegisterReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ApiError } from "@/lib/api-client"
import { formatBizNoInput } from "@/lib/utils"
import {
  useCreateTaxParty,
  useUpdateTaxParty,
  type TaxParty,
  type TaxPartyInput,
} from "../hooks/use-tax-parties"

const optionalEmailSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || z.string().email().safeParse(value).success, {
    message: "올바른 이메일 형식으로 입력해주세요",
  })

const taxPartyFormSchema = z.object({
  name: z.string().trim().min(1, "사업자명을 입력해주세요").max(100, "100자 이내로 입력해주세요"),
  bizNo: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "사업자등록번호는 10자리 숫자로 입력해주세요"),
  representativeName: z.string().trim().max(50, "50자 이내로 입력해주세요"),
  businessType: z.string().trim().max(50, "50자 이내로 입력해주세요"),
  businessItem: z.string().trim().max(50, "50자 이내로 입력해주세요"),
  taxInvoiceEmail: optionalEmailSchema,
  address: z.string().trim().max(200, "200자 이내로 입력해주세요"),
})

type TaxPartyFormData = z.infer<typeof taxPartyFormSchema>

interface TaxPartyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  party?: TaxParty | null
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

export function TaxPartyModal({ open, onOpenChange, party }: TaxPartyModalProps) {
  const createMutation = useCreateTaxParty()
  const updateMutation = useUpdateTaxParty()
  const isEditing = !!party

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<TaxPartyFormData>({
    resolver: zodResolver(taxPartyFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      bizNo: "",
      representativeName: "",
      businessType: "",
      businessItem: "",
      taxInvoiceEmail: "",
      address: "",
    },
  })

  useEffect(() => {
    if (!open) return

    reset({
      name: party?.name ?? "",
      bizNo: party?.bizNo ?? "",
      representativeName: party?.representativeName ?? "",
      businessType: party?.businessType ?? "",
      businessItem: party?.businessItem ?? "",
      taxInvoiceEmail: party?.taxInvoiceEmail ?? "",
      address: party?.address ?? "",
    })
  }, [open, party, reset])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) reset()
    onOpenChange(newOpen)
  }

  const handleError = (error: Error) => {
    if (error instanceof ApiError && error.status === 409) {
      toast.error("이미 등록된 사업자등록번호입니다")
      return
    }
    toast.error("사업자 정보 저장에 실패했습니다")
  }

  const onSubmit = (data: TaxPartyFormData) => {
    const payload: TaxPartyInput = {
      name: data.name.trim(),
      bizNo: data.bizNo.trim(),
      representativeName: emptyToNull(data.representativeName),
      businessType: emptyToNull(data.businessType),
      businessItem: emptyToNull(data.businessItem),
      taxInvoiceEmail: emptyToNull(data.taxInvoiceEmail),
      address: emptyToNull(data.address),
    }

    if (isEditing) {
      updateMutation.mutate(
        { id: party.id, ...payload },
        {
          onSuccess: () => {
            toast.success("사업자 정보가 수정되었습니다")
            handleOpenChange(false)
          },
          onError: handleError,
        }
      )
      return
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("사업자 정보가 등록되었습니다")
        handleOpenChange(false)
      },
      onError: handleError,
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            {isEditing ? "사업자 정보 수정" : "사업자 정보 등록"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            세금계산서 발급에 사용할 사업자 마스터 정보를 관리합니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 sm:px-1">
            <TextField
              id="tax-party-name"
              label="사업자명"
              placeholder="사업자명"
              error={errors.name?.message}
              registration={register("name")}
            />
            <div className="space-y-2">
              <Label htmlFor="tax-party-biz-no">사업자등록번호</Label>
              <Controller
                name="bizNo"
                control={control}
                render={({ field }) => (
                  <Input
                    id="tax-party-biz-no"
                    inputMode="numeric"
                    placeholder="123-45-67890"
                    autoComplete="off"
                    value={formatBizNoInput(field.value ?? "")}
                    onChange={(event) =>
                      field.onChange(event.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    onBlur={field.onBlur}
                    aria-invalid={!!errors.bizNo}
                  />
                )}
              />
              {errors.bizNo?.message && (
                <p className="text-sm text-destructive">{errors.bizNo.message}</p>
              )}
            </div>
            <TextField
              id="tax-party-representative"
              label="대표자명"
              error={errors.representativeName?.message}
              registration={register("representativeName")}
            />
            <TextField
              id="tax-party-business-type"
              label="업태"
              error={errors.businessType?.message}
              registration={register("businessType")}
            />
            <TextField
              id="tax-party-business-item"
              label="종목"
              error={errors.businessItem?.message}
              registration={register("businessItem")}
            />
            <TextField
              id="tax-party-email"
              label="세금계산서 이메일"
              type="email"
              error={errors.taxInvoiceEmail?.message}
              registration={register("taxInvoiceEmail")}
            />
            <TextField
              id="tax-party-address"
              label="주소"
              error={errors.address?.message}
              registration={register("address")}
            />
          </div>

          <ResponsiveModalFooter className="gap-2 border-t border-border pt-4 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "저장 중..." : isEditing ? "수정" : "등록"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}

function TextField({
  id,
  label,
  error,
  registration,
  type = "text",
  inputMode,
  placeholder,
}: {
  id: string
  label: string
  error?: string
  registration: UseFormRegisterReturn
  type?: string
  inputMode?: "text" | "search" | "none" | "tel" | "url" | "email" | "numeric" | "decimal"
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        {...registration}
        aria-invalid={!!error}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
