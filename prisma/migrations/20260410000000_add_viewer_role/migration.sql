-- Role enum 에 VIEWER 값을 추가한다.
-- VIEWER는 ADMIN 수준 데이터 읽기 권한을 가지되 모든 쓰기 작업이 차단되는 역할이다.
--
-- 이 마이그레이션은 기존 마이그레이션 히스토리에 드리프트가 있어 수동으로 생성되었다.
-- 신규 환경(스테이징/프로덕션)에 배포할 때는 다음 절차를 따른다:
--   1) npx prisma migrate resolve --applied 20260410000000_add_viewer_role
--   2) npx prisma db execute --file prisma/migrations/20260410000000_add_viewer_role/migration.sql
--   3) npx prisma generate
--
-- VIEWER 계정은 UI 초대 플로우 없이 DB에서 직접 User.role 을 수정해 생성한다:
--   UPDATE "User" SET role = 'VIEWER' WHERE "loginId" = '<해당 계정>';
--
-- 주의: JWT 세션 만료 전까지(최대 12시간) 기존 role 이 클라이언트에 유지된다.
--       즉시 반영이 필요하면 대상 사용자를 강제 로그아웃시켜야 한다.

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'VIEWER';
