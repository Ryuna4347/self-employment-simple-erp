"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
} from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangePhone } from "../hooks/use-change-phone";

const changePhoneFormSchema = z.object({
  phoneNumber: z
    .string()
    .regex(
      /^01[016789]-?\d{3,4}-?\d{4}$/,
      "올바른 휴대폰 번호 형식이 아닙니다 (예: 010-1234-5678)",
    ),
});

type ChangePhoneFormData = z.infer<typeof changePhoneFormSchema>;

interface ChangePhoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPhoneNumber: string | null;
}

export function ChangePhoneModal({
  open,
  onOpenChange,
  currentPhoneNumber,
}: ChangePhoneModalProps) {
  const changePhoneMutation = useChangePhone();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<ChangePhoneFormData>({
    resolver: zodResolver(changePhoneFormSchema),
    mode: "onChange",
    defaultValues: {
      phoneNumber: currentPhoneNumber ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({ phoneNumber: currentPhoneNumber ?? "" });
    }
  }, [open, currentPhoneNumber, reset]);

  const onSubmit = (data: ChangePhoneFormData) => {
    changePhoneMutation.mutate(
      { phoneNumber: data.phoneNumber.trim() || null },
      {
        onSuccess: () => {
          toast.success("휴대폰 번호가 변경되었습니다");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "변경에 실패했습니다",
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (
      !confirm(
        "등록된 휴대폰 번호를 삭제하시겠습니까? 문자메시지를 더 이상 받을 수 없습니다.",
      )
    ) {
      return;
    }

    changePhoneMutation.mutate(
      { phoneNumber: null },
      {
        onSuccess: () => {
          toast.success("휴대폰 번호가 삭제되었습니다");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(
            error instanceof Error ? error.message : "삭제에 실패했습니다",
          );
        },
      },
    );
  };

  const isPending = changePhoneMutation.isPending;

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} mobileVariant="fullscreen">
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>휴대폰 번호 변경</ResponsiveModalTitle>
        </ResponsiveModalHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto space-y-4 px-4 sm:px-1">
            <p className="text-sm text-gray-500">
              매일 오전 7시에 전일 현금 수금 내역을 문자메시지로 받습니다.
            </p>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">휴대폰 번호</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="010-1234-5678"
                {...register("phoneNumber")}
                aria-invalid={!!errors.phoneNumber}
              />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>
          </div>

          <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
            {currentPhoneNumber !== null && (
              <Button
                type="button"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={handleDelete}
                disabled={isPending}
              >
                삭제
              </Button>
            )}
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
  );
}
