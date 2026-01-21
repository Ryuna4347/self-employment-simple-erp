"use client";

import { Input } from "@/components/ui/input";
import { useSearchParams } from "next/navigation";
import { useEffect, useCallback, useState } from "react";
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
import { decodeBase64 } from "@/lib/utils";

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

const RegisterPage = () => {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [username, setUsername] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      loginId: "",
      password: "",
    },
    mode: "onChange",
  });

  const { isSubmitting, isValid } = form.formState;

  const init = useCallback(() => {
    if (!code) return;
    const { name } = JSON.parse(decodeBase64(code));
    setUsername(name);
  }, [code]);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-4">
      <div className="flex flex-col w-full max-w-md">
        <div></div>
        <div className="bg-white rounded shadow-lg p-8">
          <Form {...form}>
            <div>
              <text>직원명: {username}</text>
            </div>

            <FormField
              control={form.control}
              name="loginId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>아이디</FormLabel>
                  <FormControl>
                    <Input placeholder="아이디를 입력하세요." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>비밀번호</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="비밀번호를 입력하세요.(영문+숫자+특수문자 포함 8자리 이상 입력)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting || !isValid}>
              등록
            </Button>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
