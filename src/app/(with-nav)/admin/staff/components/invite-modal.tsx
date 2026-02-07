"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useCreateInvite, type InviteResult } from "../hooks/use-staff";

// 초대 폼 스키마
const inviteSchema = z.object({
  name: z.string().min(1, "이름을 입력해주세요").trim(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteModal({ open, onOpenChange }: InviteModalProps) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverError, setServerError] = useState("");
  const createInviteMutation = useCreateInvite();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    mode: "onChange",
    defaultValues: { name: "" },
  });

  // 모달 닫힐 때 초기화
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset({ name: "" });
      setResult(null);
      setCopied(false);
      setServerError("");
    }
    onOpenChange(newOpen);
  };

  const onSubmit = (data: InviteFormData) => {
    setServerError("");
    createInviteMutation.mutate(data, {
      onSuccess: (inviteResult) => {
        setResult(inviteResult);
      },
      onError: (error) => {
        if (error instanceof ApiError) {
          setServerError(error.message);
        } else {
          setServerError("초대 생성 중 오류가 발생했습니다");
        }
      },
    });
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 API 미지원 환경 무시
    }
  };

  const isPending = createInviteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {result ? "초대 링크 생성 완료" : "직원 초대"}
          </DialogTitle>
          {!result && (
            <DialogDescription>
              초대할 직원의 이름을 입력하세요
            </DialogDescription>
          )}
        </DialogHeader>

        {/* 1단계: 이름 입력 폼 */}
        {!result ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto space-y-4 px-1">
              <div className="space-y-2">
                <Label htmlFor="invite-name">이름</Label>
                <Input
                  id="invite-name"
                  placeholder="예: 홍길동"
                  {...register("name")}
                  aria-invalid={!!errors.name}
                  autoFocus
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-600">{serverError}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-2 pt-4  border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={!isValid || isPending}>
                {isPending ? "생성 중..." : "초대 링크 생성"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          /* 2단계: 초대 결과 표시 */
          <div className="space-y-4">
            <div className="rounded-md bg-blue-50 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-900">
                {result.name}님의 초대 링크가 생성되었습니다
              </p>

              {/* 초대 URL */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded border border-blue-200 px-3 py-2 text-sm text-gray-700 break-all select-all">
                  {result.inviteUrl}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 사용 안내 */}
            <div className="text-sm text-gray-500 space-y-1">
              <p>위 링크를 복사하여 직원에게 공유하세요.</p>
              <p>
                직원이 링크를 통해 아이디와 비밀번호를 설정하면 가입이
                완료됩니다.
              </p>
            </div>

            <DialogFooter className="pt-4  border-gray-200">
              <Button onClick={() => handleOpenChange(false)}>확인</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
