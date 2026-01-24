"use client";

import { Suspense } from "react";
import { Input } from "@/components/ui/input";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";
import { LoadingView } from "@/components/common/loading-view";
import { ErrorView } from "@/components/common/error-view";

// 페이지 상태 타입 정의
type PageState = "loading" | "error" | "form" | "submitting" | "success";

// API 응답 타입
interface VerifyResponse {
  success: boolean;
  message?: string;
  data?: {
    name: string;
    userId: string;
  };
}

interface CompleteResponse {
  success: boolean;
  message?: string;
}

// 폼 스키마
const formSchema = z.object({
  loginId: z.string().min(4, "아이디는 4자리 이상 입력해야합니다."),
  password: z
    .string()
    .min(8, "비밀번호는 8자리 이상 입력해야합니다.")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      "비밀번호는 영문+숫자+특수문자 포함 8자리 이상 입력해야합니다.",
    ),
});

type FormValues = z.infer<typeof formSchema>;

// 공통 레이아웃 컴포넌트
function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      {children}
    </div>
  );
}

// 성공 화면 컴포넌트
function SuccessView() {
  return (
    <PageLayout>
      <div className="bg-white rounded shadow-lg p-8 max-w-md w-full">
        <div className="flex flex-col items-center gap-4">
          <CheckCircle className="size-16 text-green-500" />
          <h1 className="text-xl font-semibold text-gray-900">등록 완료!</h1>
          <p className="text-center text-gray-600">
            잠시 후 로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

// 회원가입 폼 컴포넌트 (code가 있을 때만 렌더링)
function RegisterFormWithCode({ code }: { code: string }) {
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [username, setUsername] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [submitError, setSubmitError] = useState<string>("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
    mode: "onChange",
  });

  const { isValid } = form.formState;

  // 페이지 마운트 시 초대 코드 검증
  useEffect(() => {
    // AbortController로 cleanup 처리
    const abortController = new AbortController();
    let isMounted = true;

    const verifyInviteCode = async () => {
      try {
        const response = await fetch("/api/register/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
          signal: abortController.signal,
        });

        const data: VerifyResponse = await response.json();

        if (!isMounted) return;

        if (data.success && data.data) {
          setUsername(data.data.name);
          setPageState("form");
        } else {
          setErrorMessage(data.message || "초대 코드 검증에 실패했습니다.");
          setPageState("error");
        }
      } catch (error) {
        if (!isMounted) return;
        // AbortError는 무시 (컴포넌트 언마운트 시)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        setErrorMessage("서버와 통신 중 오류가 발생했습니다.");
        setPageState("error");
      }
    };

    verifyInviteCode();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [code]);

  // 폼 제출 핸들러
  const onSubmit = async (values: FormValues) => {
    setPageState("submitting");
    setSubmitError("");

    try {
      const response = await fetch("/api/register/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code,
          loginId: values.loginId,
          password: values.password,
        }),
      });

      const data: CompleteResponse = await response.json();

      if (data.success) {
        setPageState("success");
        // 2초 후 메인 페이지로 리다이렉트
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setSubmitError(data.message || "회원가입 처리 중 오류가 발생했습니다.");
        setPageState("form");
      }
    } catch {
      setSubmitError("서버와 통신 중 오류가 발생했습니다.");
      setPageState("form");
    }
  };

  // 로딩 상태 UI
  if (pageState === "loading") {
    return <LoadingView message="초대 정보를 확인하는 중..." />;
  }

  // 에러 상태 UI
  if (pageState === "error") {
    return <ErrorView message={errorMessage} />;
  }

  // 성공 상태 UI
  if (pageState === "success") {
    return <SuccessView />;
  }

  // 폼 상태 UI (form 또는 submitting)
  const isSubmitting = pageState === "submitting";

  return (
    <PageLayout>
      <div className="flex flex-col w-full max-w-md">
        <div className="bg-white rounded shadow-lg p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">회원가입</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* 직원명 표시 */}
              <div className="bg-gray-50 rounded p-4 border border-gray-200">
                <p className="text-sm text-gray-500">직원명</p>
                <p className="text-lg font-medium text-gray-900">{username}</p>
              </div>

              {/* 아이디 입력 */}
              <FormField
                control={form.control}
                name="loginId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>아이디</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="아이디를 입력하세요."
                        disabled={isSubmitting}
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
                        placeholder="비밀번호를 입력하세요. (영문+숫자+특수문자 포함 8자리 이상)"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* 제출 에러 메시지 */}
              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-600">{submitError}</p>
                </div>
              )}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !isValid}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  "등록"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </PageLayout>
  );
}

// 회원가입 폼 컨테이너 (code 파라미터 체크)
function RegisterForm() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  // code가 없으면 에러 화면 표시 (렌더 시점에 결정)
  if (!code) {
    return (
      <ErrorView message="초대 코드가 없습니다. 올바른 링크로 접속해주세요." />
    );
  }

  return <RegisterFormWithCode code={code} />;
}

// 메인 페이지 컴포넌트 (Suspense로 감싸기)
export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingView message="페이지를 불러오는 중..." />}>
      <RegisterForm />
    </Suspense>
  );
}
