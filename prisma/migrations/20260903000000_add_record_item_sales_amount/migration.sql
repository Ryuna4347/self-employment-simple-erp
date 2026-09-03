-- AlterTable: RecordItem에 매출 원금 컬럼 추가
-- amount는 수금 처리 시 0 또는 이월로 변경되는 "현재 잔액"이고,
-- salesAmount는 등록 시점 금액을 고정 보관하는 "매출 원금"이다.
-- 상수 기본값 컬럼 추가는 PostgreSQL 11+에서 테이블 재작성 없이 즉시 적용된다.
-- 과거 데이터는 백필하지 않는다 (SALES_AMOUNT_CUTOVER_DATE 이전 기록은 amount 기준 집계).
ALTER TABLE "RecordItem" ADD COLUMN "salesAmount" INTEGER NOT NULL DEFAULT 0;
