-- CreateEnum
CREATE TYPE "CollectionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "CollectionRequest" (
    "id" TEXT NOT NULL,
    "storeId" TEXT,
    "storeNameSnapshot" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" "CollectionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionRequestItem" (
    "id" TEXT NOT NULL,
    "collectionRequestId" TEXT NOT NULL,
    "workRecordId" TEXT NOT NULL,

    CONSTRAINT "CollectionRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionRequest_status_idx" ON "CollectionRequest"("status");

-- CreateIndex
CREATE INDEX "CollectionRequest_requesterId_idx" ON "CollectionRequest"("requesterId");

-- CreateIndex
CREATE INDEX "CollectionRequest_storeId_status_idx" ON "CollectionRequest"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionRequestItem_collectionRequestId_workRecordId_key" ON "CollectionRequestItem"("collectionRequestId", "workRecordId");

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequest" ADD CONSTRAINT "CollectionRequest_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequestItem" ADD CONSTRAINT "CollectionRequestItem_collectionRequestId_fkey" FOREIGN KEY ("collectionRequestId") REFERENCES "CollectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionRequestItem" ADD CONSTRAINT "CollectionRequestItem_workRecordId_fkey" FOREIGN KEY ("workRecordId") REFERENCES "WorkRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
