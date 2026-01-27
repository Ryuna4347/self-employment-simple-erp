import { Header, BottomNav } from "@/components/common";

/**
 * 인증된 사용자 전용 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **인증 처리**:
 * - 미들웨어에서 iron-session 쿠키 + Auth.js 인증 체크
 * - 이 레이아웃에 도달하면 이미 인증된 상태
 *
 * **디자인 의도**:
 * - 일관된 네비게이션 제공
 * - 헤더 sticky 포지셔닝으로 스크롤 시에도 접근성 유지
 * - 하단 네비 고정으로 주요 도메인 간 빠른 전환
 * - pb-20으로 하단 네비에 컨텐츠가 가려지지 않도록 여백 확보
 * - 최대 너비 제한 없이 각 페이지에서 자율적으로 제어
 */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
