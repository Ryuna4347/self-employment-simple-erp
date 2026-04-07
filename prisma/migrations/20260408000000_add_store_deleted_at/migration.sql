-- AlterTable: Store에 소프트 삭제 시점 컬럼 추가
ALTER TABLE "Store" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex: 대시보드 기간별 삭제 매장 조회용
CREATE INDEX "Store_deletedAt_idx" ON "Store"("deletedAt");
