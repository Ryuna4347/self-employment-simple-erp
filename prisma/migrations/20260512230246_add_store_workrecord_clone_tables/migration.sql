-- CreateTable
CREATE TABLE "StoreClone" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "managerName" TEXT,
    "PaymentType" "PaymentType" NOT NULL DEFAULT 'CASH',
    "kakaoPlaceId" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "receiptType" "ReceiptType" NOT NULL DEFAULT 'NONE',
    "note" TEXT,
    "assignedUserId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreClone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRecordClone" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storeId" TEXT,
    "userId" TEXT NOT NULL,
    "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'UNCOLLECTED',
    "imageUrl" TEXT,
    "note" TEXT,
    "storeNameSnapshot" TEXT,
    "storeAddressSnapshot" TEXT,
    "managerNameSnapshot" TEXT,
    "paymentTypeSnapshot" "PaymentType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "collectedByUserId" TEXT,

    CONSTRAINT "WorkRecordClone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordItemClone" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "workRecordCloneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RecordItemClone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoreClone_sourceId_idx" ON "StoreClone"("sourceId");

-- CreateIndex
CREATE INDEX "StoreClone_isDeleted_idx" ON "StoreClone"("isDeleted");

-- CreateIndex
CREATE INDEX "WorkRecordClone_sourceId_idx" ON "WorkRecordClone"("sourceId");

-- CreateIndex
CREATE INDEX "WorkRecordClone_date_idx" ON "WorkRecordClone"("date");

-- CreateIndex
CREATE INDEX "WorkRecordClone_collectionStatus_idx" ON "WorkRecordClone"("collectionStatus");

-- CreateIndex
CREATE INDEX "RecordItemClone_workRecordCloneId_idx" ON "RecordItemClone"("workRecordCloneId");

-- CreateIndex
CREATE INDEX "RecordItemClone_sourceId_idx" ON "RecordItemClone"("sourceId");
