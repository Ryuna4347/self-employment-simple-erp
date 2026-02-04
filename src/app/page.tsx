"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Store } from "lucide-react";

// 로그인 폼 스키마
const loginSchema = z.object({
  loginId: z.string().min(1, "아이디를 입력해주세요."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
  rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Suspense boundary 내부에서 useSearchParams를 사용하는 로그인 폼 컴포넌트
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (searchParams.get('sessionExpired') === 'true') {
      setErrorMessage('세션이 만료되었습니다. 다시 로그인해주세요.')
    } else if (searchParams.get('authError') === 'true') {
      setErrorMessage('인증 정보가 유효하지 않습니다. 다시 로그인해주세요.')
    }
  }, [searchParams])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginId: "",
      password: "",
      rememberMe: false,
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
        rememberMe: values.rememberMe ? "true" : "false",
        redirect: false,
      });

      if (result?.error) {
        // 로그인 실패
        setErrorMessage("아이디 또는 비밀번호가 올바르지 않습니다.");
        setIsSubmitting(false);
      } else if (result?.ok) {
        // 로그인 성공 - 바로 리다이렉트
        router.push("/work-records");
        router.refresh();
      }
    } catch {
      setErrorMessage("로그인 처리 중 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
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

            {/* 로그인 상태 유지 체크박스 */}
            <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-0.5 leading-none">
                      <FormLabel className="text-sm font-normal cursor-pointer">
                        로그인 상태 유지
                      </FormLabel>
                      <FormDescription className="text-xs">
                        7일간 자동으로 로그인됩니다. 공용 PC에서는 사용을 권장하지 않습니다.
                      </FormDescription>
                    </div>
                  </div>
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
  );
}

// 로딩 폴백 컴포넌트
function LoginFormSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-xl shadow-black/5 border border-gray-100">
      <div className="p-8">
        <div className="h-6 w-16 bg-gray-200 rounded mb-6 animate-pulse" />
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-10 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="h-10 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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

        {/* 로그인 폼 카드 - Suspense로 감싸기 */}
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>

        {/* 푸터 정보 */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>관리자에게 받은 초대 링크로 계정을 등록할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}
