"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Role } from "@/generated/prisma/client";

interface SessionUser {
  id: string;
  name: string;
  loginId: string;
  role: Role;
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
 *   - 사용자 프로필 버튼 (이름 + 역할 표시)
 *
 * **접근성**:
 * - semantic header 태그 사용
 * - 키보드 네비게이션 지원
 * - 명확한 시각적 피드백 (현재 페이지 표시)
 */
export function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 세션 정보 가져오기
  useEffect(() => {
    async function fetchSession() {
      try {
        const response = await fetch("/api/auth/session");
        if (response.ok) {
          const session = await response.json();
          if (session?.user) {
            setUser(session.user);
          }
        }
      } catch (error) {
        console.error("세션 로드 실패:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSession();
  }, []);

  // 로딩 중이거나 사용자가 없으면 렌더링하지 않음
  if (isLoading || !user) {
    return null;
  }

  const isAdmin = user.role === "ADMIN";
  const isOnAdminPage = pathname.startsWith("/admin");

  return (
    <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
      <div className="px-4 py-4 flex items-center justify-between max-w-7xl mx-auto">
        {/* 좌측: 제품명 */}
        <h1 className="text-lg font-semibold text-gray-900">
          Small-Shop ERP
        </h1>

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
              <Link href="/admin">
                관리자
              </Link>
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
              <span className="text-gray-700 font-medium">
                {user.name}
              </span>
              {/* 역할 표시 인디케이터 */}
              <span
                className={`size-2 rounded-full ${
                  isAdmin ? "bg-red-500" : "bg-green-500"
                }`}
                aria-label={isAdmin ? "관리자" : "사용자"}
              />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
