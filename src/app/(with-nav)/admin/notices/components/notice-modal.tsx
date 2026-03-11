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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useCreateNotice, useUpdateNotice, type NoticeRecord } from "../hooks/use-notices"

const noticeFormSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  content: z.string().min(1, "내용을 입력해주세요").trim(),
  expiresAt: z.string().optional(),
})

type NoticeFormData = z.infer<typeof noticeFormSchema>

interface NoticeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingNotice: NoticeRecord | null
}

export function NoticeModal({ open, onOpenChange, editingNotice }: NoticeModalProps) {
  const createMutation = useCreateNotice()
  const updateMutation = useUpdateNotice()
  const isEditing = !!editingNotice

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<NoticeFormData>({
    resolver: zodResolver(noticeFormSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      content: "",
      expiresAt: "",
    },
  })

  // 수정 모드 시 기존 값 세팅
  useEffect(() => {
    if (open && editingNotice) {
      reset({
        title: editingNotice.title,
        content: editingNotice.content,
        expiresAt: editingNotice.expiresAt
          ? new Date(editingNotice.expiresAt).toISOString().split("T")[0]
          : "",
      })
    } else if (open && !editingNotice) {
      reset({
        title: "",
        content: "",
        expiresAt: "",
      })
    }
  }, [open, editingNotice, reset])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset()
    }
    onOpenChange(newOpen)
  }

  const onSubmit = (data: NoticeFormData) => {
    const payload = {
      title: data.title,
      content: data.content,
      expiresAt: data.expiresAt || null,
    }
    if (isEditing) {
      updateMutation.mutate(
        { id: editingNotice.id, ...payload },
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
            {isEditing ? "공지 수정" : "공지 작성"}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            {isEditing ? "공지 내용을 수정하세요" : "새로운 공지를 작성하세요"}
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
            <div className="space-y-2">
              <Label htmlFor="notice-title">제목</Label>
              <Input
                id="notice-title"
                placeholder="공지 제목"
                {...register("title")}
                aria-invalid={!!errors.title}
                autoFocus
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-content">내용</Label>
              <Textarea
                id="notice-content"
                placeholder="공지 내용을 입력하세요"
                rows={5}
                {...register("content")}
                aria-invalid={!!errors.content}
              />
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notice-expires">만료일 (선택)</Label>
              <Input
                id="notice-expires"
                type="date"
                {...register("expiresAt")}
              />
              <p className="text-xs text-gray-400">
                비워두면 수동으로 삭제할 때까지 표시됩니다
              </p>
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
                  : "작성 중..."
                : isEditing
                  ? "수정"
                  : "작성"}
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
