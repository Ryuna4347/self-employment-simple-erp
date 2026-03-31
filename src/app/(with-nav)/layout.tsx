import { redirect } from "next/navigation";
import { Header, BottomNav } from "@/components/common";
import { AppProviders } from "@/components/providers/app-providers";
import { getSessionFromJWT } from "@/lib/get-session";

/**
 * 네비게이션 포함 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **세션 처리**:
 * - 서버에서 accessToken JWT 검증하여 세션 상태 확인
 * - 유효하지 않으면 → 로그인 페이지로 redirect
 * - 유효한 세션이면 Header에 user 정보를 props로 전달
 */
export default async function WithNavLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromJWT();

  if (!session?.user) {
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
