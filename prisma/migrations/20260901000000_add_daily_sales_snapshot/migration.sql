-- 일별 매출 스냅샷 테이블
--
-- 수금 처리 시 과거 RecordItem.amount 가 0 으로 덮어써지기 때문에
-- (src/lib/collection-utils.ts 의 consolidateAndCollect, 그리고
--  src/app/api/admin/outstanding/batch-collect 경로),
-- 원장에서 실시간 계산한 일별 매출은 나중에 조회하면 0 원이 된다.
-- 매일 밤 크론(/api/cron/daily-sales-snapshot)이 그날 매출을 여기에 고정 저장한다.
--
-- date 는 WorkRecord.date 와 동일하게 KST 자정으로 정규화된 값을 넣는다.
-- 집계 파생 테이블이므로 isDeleted/deletedAt 소프트 삭제 컬럼은 두지 않는다.

-- CreateTable
CREATE TABLE "DailySalesSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" INTEGER NOT NULL DEFAULT 0,
    "cashRevenue" INTEGER NOT NULL DEFAULT 0,
    "accountRevenue" INTEGER NOT NULL DEFAULT 0,
    "cardRevenue" INTEGER NOT NULL DEFAULT 0,
    "recordCount" INTEGER NOT NULL DEFAULT 0,
    "storeCount" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySalesSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesSnapshot_date_key" ON "DailySalesSnapshot"("date");
