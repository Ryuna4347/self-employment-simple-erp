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
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { passwordSchema } from "@/lib/validations"
import { koreanToEnglish } from "@/lib/korean-to-english"
import { useChangePassword } from "../hooks/use-change-password"

// 비밀번호 변경 폼 스키마
const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력해주세요"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해주세요"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  })

type ChangePasswordFormData = z.infer<typeof changePasswordFormSchema>

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({
  open,
  onOpenChange,
}: ChangePasswordModalProps) {
  const changePasswordMutation = useChangePassword()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordFormSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  // 모달 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      reset({ currentPassword: "", newPassword: "", confirmPassword: "" })
    }
  }, [open, reset])

  const onSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  const isPending = changePasswordMutation.isPending

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>비밀번호 변경</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
            {/* 현재 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">현재 비밀번호</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="현재 비밀번호를 입력하세요"
                {...register("currentPassword", {
                  onChange: (e) => {
                    e.target.value = koreanToEnglish(e.target.value)
                  },
                })}
                aria-invalid={!!errors.currentPassword}
              />
              {errors.currentPassword && (
                <p className="text-sm text-red-500">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* 수정할 비밀번호 */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">수정할 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="새 비밀번호를 입력하세요"
                {...register("newPassword", {
                  onChange: (e) => {
                    e.target.value = koreanToEnglish(e.target.value)
                  },
                })}
                aria-invalid={!!errors.newPassword}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            {/* 수정할 비밀번호 확인 */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">수정할 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="새 비밀번호를 다시 입력하세요"
                {...register("confirmPassword", {
                  onChange: (e) => {
                    e.target.value = koreanToEnglish(e.target.value)
                  },
                })}
                aria-invalid={!!errors.confirmPassword}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

          </div>

          <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              취소
            </Button>
            <Button type="submit" disabled={!isValid || isPending}>
              {isPending ? "변경 중..." : "변경"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
