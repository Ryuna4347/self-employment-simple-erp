"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Store } from "lucide-react";

// 로그인 폼 스키마
const loginSchema = z.object({
  loginId: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
    mode: "onSubmit",
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        id: values.loginId,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        // 로그인 실패
        setErrorMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
        setIsSubmitting(false);
      } else if (result?.ok) {
        // 로그인 성공 - /work-records로 리다이렉트
        router.push("/work-records");
        router.refresh();
      }
    } catch {
      setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* 헤더 영역 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <div className="size-14 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Store className="size-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Small-Shop ERP
          </h1>
          <p className="text-gray-600 mt-2 text-sm">
            중소기업 및 자영업자 맞춤형 ERP
          </p>
        </div>

        {/* 로그인 폼 카드 */}
        <div className="bg-white rounded-lg shadow-xl shadow-black/5 border border-gray-100">
          <div className="p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">로그인</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* 아이디 입력 */}
                <FormField
                  control={form.control}
                  name="loginId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>아이디</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="아이디를 입력하세요"
                          disabled={isSubmitting}
                          autoComplete="username"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 비밀번호 입력 */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>비밀번호</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="비밀번호를 입력하세요"
                          disabled={isSubmitting}
                          autoComplete="current-password"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* 에러 메시지 표시 영역 */}
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-600 text-center">
                      {errorMessage}
                    </p>
                  </div>
                )}

                {/* 로그인 버튼 */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      로그인 중...
                    </>
                  ) : (
                    "로그인"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* 푸터 정보 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>관리자에게 받은 초대 링크로 계정을 등록할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
