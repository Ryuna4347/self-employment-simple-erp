import { Header, BottomNav } from "@/components/common";

/**
 * 네비게이션 포함 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **디자인 의도**:
 * - 일관된 네비게이션 제공 (Header + BottomNav)
 * - 헤더 sticky 포지셔닝으로 스크롤 시에도 접근성 유지
 * - 하단 네비 고정으로 주요 도메인 간 빠른 전환
 * - pb-20으로 하단 네비에 컨텐츠가 가려지지 않도록 여백 확보
 * - 최대 너비 제한 없이 각 페이지에서 자율적으로 제어
 *
 * **인증**: 미들웨어에서 처리 (middleware.ts)
 */
export default function WithNavLayout({
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
