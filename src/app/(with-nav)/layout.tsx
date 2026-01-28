import { redirect } from "next/navigation";
import { Header, BottomNav } from "@/components/common";
import { AppProviders } from "@/components/providers/app-providers";
import { auth } from "@/auth";

/**
 * 네비게이션 포함 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **세션 처리**:
 * - 서버에서 auth() 호출하여 세션 상태 확인
 * - session.error 또는 user.id 없음 → 로그인 페이지로 redirect
 * - 유효한 세션이면 Header에 user 정보를 props로 전달
 *
 * **Provider 구조**:
 * - AppProviders: QueryClientProvider (401 전역 처리 포함)
 *
 * **디자인 의도**:
 * - 일관된 네비게이션 제공 (Header + BottomNav)
 * - 헤더 sticky 포지셔닝으로 스크롤 시에도 접근성 유지
 * - 하단 네비 고정으로 주요 도메인 간 빠른 전환
 * - pb-20으로 하단 네비에 컨텐츠가 가려지지 않도록 여백 확보
 */
export default async function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // 세션 에러 또는 user.id 없음 → 로그인 페이지로
  if (session?.error || !session?.user?.id) {
    redirect("/?sessionExpired=true");
  }

  return (
    <AppProviders>
      <Header user={session.user} />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </AppProviders>
  );
}
