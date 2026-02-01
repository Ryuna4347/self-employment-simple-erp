import { Header, BottomNav } from "@/components/common";
import { AppProviders } from "@/components/providers/app-providers";
import { getSessionFromJWT } from "@/lib/get-session";

/**
 * 네비게이션 포함 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **세션 처리**:
 * - 미들웨어에서 JWT 검증 완료 (에러 체크, 로그인 여부)
 * - 여기서는 JWT 디코딩하여 user 정보만 가져옴
 * - 토큰 갱신은 실제 API 호출 시 Route Handler에서만 발생
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
  // 미들웨어에서 이미 검증됨 - 여기선 user 정보만 가져옴
  const session = await getSessionFromJWT();

  // 안전장치 (미들웨어 통과 못하면 여기 도달 안함)
  if (!session?.user) {
    return null;
  }

  return (
    <AppProviders>
      <Header user={session.user} />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </AppProviders>
  );
}
