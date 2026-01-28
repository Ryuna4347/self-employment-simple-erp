"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Role } from "@/generated/prisma/client";

interface HeaderProps {
  user: {
    id: string;
    name: string;
    loginId: string;
    role: Role;
  };
}

/**
 * 공통 헤더 컴포넌트
 *
 * **디자인 목적**: 사용자가 현재 위치를 파악하고, 권한에 따른 주요 네비게이션을 제공
 *
 * **기능**:
 * - 좌측: 제품명 표시 (브랜드 아이덴티티)
 * - 우측:
 *   - 관리자 메뉴 버튼 (ADMIN 권한만 표시)
 *   - 사용자 프로필 버튼 (이름 표시)
 *
 * **데이터**: layout.tsx에서 서버 세션으로부터 user 정보를 props로 전달받음
 *
 * **접근성**:
 * - semantic header 태그 사용
 * - 키보드 네비게이션 지원
 * - 명확한 시각적 피드백 (현재 페이지 표시)
 */
export function Header({ user }: HeaderProps) {
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN";
  const isOnAdminPage = pathname.startsWith("/admin");

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
      <div className="px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* 좌측: 제품명 */}
        <h1 className="text-lg font-semibold text-gray-900">Small-Shop ERP</h1>

        {/* 우측: 네비게이션 및 프로필 */}
        <div className="flex items-center gap-3">
          {/* 관리자 메뉴 버튼 (ADMIN만 표시) */}
          {isAdmin && (
            <Button
              asChild
              variant={isOnAdminPage ? "default" : "outline"}
              size="sm"
              className="transition-all"
            >
              <Link href="/admin">관리자</Link>
            </Button>
          )}

          {/* 사용자 프로필 버튼 */}
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="gap-2 hover:bg-gray-50 transition-colors"
          >
            <Link href="/profile">
              <span className="text-gray-700 font-medium">{user.name}</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
