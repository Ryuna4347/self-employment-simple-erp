"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { broadcastSignOut } from "@/hooks/use-session-sync";
import { ChangePasswordModal } from "./change-password-modal";
import type { Role } from "@/generated/prisma/client";

interface ProfileContentProps {
  user: {
    id: string;
    name: string;
    loginId: string;
    role: Role;
  };
}

export function ProfileContent({ user }: ProfileContentProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    broadcastSignOut();
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 페이지 제목 */}
      <h1 className="mb-6 text-xl font-bold text-gray-900">내 정보</h1>

      {/* 사용자 정보 카드 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* 프로필 헤더 */}
        <div className="px-4 py-5 flex items-center gap-3 border-b border-gray-100">
          <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center">
            <User className="size-6 text-gray-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">
              {user.role === "ADMIN" ? "관리자" : "직원"}
            </p>
          </div>
        </div>

        {/* 정보 행 */}
        <div className="divide-y divide-gray-100">
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">이름</span>
            <span className="text-sm font-medium text-gray-900">
              {user.name}
            </span>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">아이디</span>
            <span className="text-sm font-medium text-gray-900">
              {user.loginId}
            </span>
          </div>
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-gray-500">비밀번호</span>
            <Button
              variant="outline"
              size="sm"
              className="h-auto px-3 py-1 text-sm font-medium"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              비밀번호 변경
            </Button>
          </div>
        </div>
      </div>

      {/* 로그아웃 버튼 */}
      <div className="mt-8">
        <Button
          className="w-full bg-red-400 text-white hover:bg-red-300"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <LogOut className="size-4" />
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
      </div>

      {/* 비밀번호 변경 모달 */}
      <ChangePasswordModal
        open={isPasswordModalOpen}
        onOpenChange={setIsPasswordModalOpen}
      />
    </div>
  );
}
