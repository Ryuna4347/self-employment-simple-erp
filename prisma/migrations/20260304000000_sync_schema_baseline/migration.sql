-- CreateEnum
CREATE TYPE "ReceiptType" AS ENUM ('NONE', 'SIMPLE_RECEIPT', 'TRANSACTION_STATEMENT');

-- AlterTable: Store - 새 필드 추가
ALTER TABLE "Store" ADD COLUMN "assignedUserId" TEXT;
ALTER TABLE "Store" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Store" ADD COLUMN "firstVisitDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Store" ADD COLUMN "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Store" ADD COLUMN "receiptType" "ReceiptType" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Store" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Store" ADD COLUMN "visitCycleWeeks" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: StoreTemplate - 타임스탬프 추가
ALTER TABLE "StoreTemplate" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "StoreTemplate" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: WorkRecord - 스냅샷 및 수금 필드 추가
ALTER TABLE "WorkRecord" ADD COLUMN "collectedAt" TIMESTAMP(3);
ALTER TABLE "WorkRecord" ADD COLUMN "collectedByUserId" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkRecord" ADD COLUMN "managerNameSnapshot" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WorkRecord" ADD COLUMN "storeAddressSnapshot" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "storeNameSnapshot" TEXT;
ALTER TABLE "WorkRecord" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "WorkRecord" ALTER COLUMN "storeId" DROP NOT NULL;

-- AddForeignKey: Store.assignedUserId -> User
ALTER TABLE "Store" ADD CONSTRAINT "Store_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: WorkRecord.collectedByUserId -> User
ALTER TABLE "WorkRecord" ADD CONSTRAINT "WorkRecord_collectedByUserId_fkey" FOREIGN KEY ("collectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Store
CREATE INDEX "Store_isDeleted_idx" ON "Store"("isDeleted");

-- CreateIndex: WorkRecord (대시보드 최적화)
CREATE INDEX "WorkRecord_date_idx" ON "WorkRecord"("date");
CREATE INDEX "WorkRecord_userId_date_idx" ON "WorkRecord"("userId", "date");
CREATE INDEX "WorkRecord_storeId_collectionStatus_idx" ON "WorkRecord"("storeId", "collectionStatus");
CREATE INDEX "WorkRecord_collectionStatus_date_idx" ON "WorkRecord"("collectionStatus", "date");
CREATE INDEX "WorkRecord_collectionStatus_storeNameSnapshot_idx" ON "WorkRecord"("collectionStatus", "storeNameSnapshot");
