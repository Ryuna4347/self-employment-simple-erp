import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/common";

/**
 * 인증된 사용자 전용 레이아웃
 *
 * **적용 범위**: /work-records, /stores, /store-templates, /admin 등
 *
 * **구조**:
 * - 세션 유효성 검증 (user.id 존재 여부)
 * - 공통 헤더 (상단 고정)
 * - 메인 컨텐츠 영역
 *
 * **디자인 의도**:
 * - 일관된 네비게이션 제공
 * - 헤더 sticky 포지셔닝으로 스크롤 시에도 접근성 유지
 * - 최대 너비 제한 없이 각 페이지에서 자율적으로 제어
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 세션 유효성 검증 (미들웨어에서 못 잡는 빈 객체 케이스 처리)
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/");
  }

  return (
    <>
      <Header />
      <main>{children}</main>
    </>
  );
}
