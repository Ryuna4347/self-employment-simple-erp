"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Store, Layers, Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 하단 네비게이션 아이템 정의
 *
 * 각 항목은 자영업 ERP의 핵심 도메인에 대응:
 * - 근무 기록: 일별 방문/거래 관리 (메인 기능)
 * - 매장: 매장 정보 관리
 * - 코스: 순회 템플릿 (매장 그룹)
 * - 물품: 판매 품목 관리
 */
const NAV_ITEMS = [
  {
    href: "/work-records",
    label: "근무 기록",
    icon: Home,
  },
  {
    href: "/stores",
    label: "매장",
    icon: Store,
  },
  {
    href: "/store-templates",
    label: "코스",
    icon: Layers,
  },
  {
    href: "/sale-items",
    label: "물품",
    icon: Package,
  },
] as const;

/**
 * 하단 네비게이션 컴포넌트
 *
 * **디자인 목적**: 모바일 환경에서 주요 도메인 간 빠른 전환을 제공
 *
 * **시각적 계층구조**:
 * - 활성 탭: primary 색상 + 굵은 스트로크로 현재 위치 명확히 표시
 * - 비활성 탭: muted 색상으로 시각적 노이즈 최소화
 * - 활성 인디케이터: 상단 2px 바로 즉각적인 위치 인지
 *
 * **접근성**:
 * - semantic nav 태그 + aria-label 사용
 * - 현재 페이지는 aria-current="page" 표시
 * - 키보드 네비게이션 지원 (Link 컴포넌트 기반)
 * - 포커스 링 명확히 표시
 * - safe-area-inset 대응 (노치/홈바 디바이스)
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-1px_3px_0_rgb(0_0_0/0.05)]"
      aria-label="주요 메뉴"
    >
      <div className="flex items-stretch justify-around max-w-4xl mx-auto">
        {NAV_ITEMS.map((item) => {
          // 현재 경로가 해당 메뉴의 하위 경로인지 확인
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                // 기본 레이아웃
                "relative flex-1 flex flex-col items-center justify-center",
                "py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
                "transition-colors duration-150",
                // 포커스 스타일 (접근성)
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                // 활성/비활성 색상
                isActive
                  ? "text-blue-500"
                  : "text-muted-foreground hover:text-foreground/70",
              )}
            >
              {/* 활성 인디케이터: 상단 바 */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-500"
                  aria-hidden="true"
                />
              )}

              <Icon
                className={cn(
                  "size-5 mb-0.5",
                  isActive && "stroke-[2.5px]",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "text-[0.625rem] leading-tight",
                  isActive ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
