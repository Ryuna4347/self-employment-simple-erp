"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@/components/providers/app-providers";
import { isViewer } from "@/lib/role-utils";
import {
  Home,
  Store,
  Layers,
  LayoutDashboard,
  Users,
  CircleDollarSign,
  ClipboardCheck,
  Receipt,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/work-records", label: "근무 기록", icon: Home },
  { href: "/store-templates", label: "코스", icon: Layers },
  { href: "/stores", label: "매장", icon: Store },
] as const;

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/admin/staff", label: "직원 관리", icon: Users },
  { href: "/admin/outstanding", label: "미수금 관리", icon: CircleDollarSign },
  { href: "/admin/collections", label: "수금 관리", icon: ClipboardCheck },
  { href: "/admin/costs", label: "비용 관리", icon: Receipt },
  { href: "/admin/notices", label: "공지", icon: Megaphone },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { role } = useUser();
  const isAdminMode = isViewer(role) || pathname.startsWith("/admin");
  const navItems = isAdminMode ? ADMIN_NAV_ITEMS : NAV_ITEMS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-t border-border shadow-[0_-1px_3px_0_rgb(0_0_0/0.05)]"
      aria-label={isAdminMode ? "관리자 메뉴" : "주요 메뉴"}
    >
      <div className="mx-auto flex max-w-4xl items-stretch overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-w-20 flex-1 flex-col items-center justify-center",
                "py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                isActive ? "text-blue-500" : "text-muted-foreground hover:text-foreground/70",
              )}
            >
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-500"
                  aria-hidden="true"
                />
              )}
              <Icon
                className={cn("size-5 mb-0.5", isActive && "stroke-[2.5px]")}
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
