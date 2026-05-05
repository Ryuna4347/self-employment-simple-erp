-- CreateEnum
CREATE TYPE "TaxInvoiceStatus" AS ENUM ('SUBMITTED', 'SKIPPED', 'FAILED');

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "bizNo" VARCHAR(10),
ADD COLUMN "taxInvoiceEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaxInvoiceResult" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" "TaxInvoiceStatus" NOT NULL,
    "mode" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxInvoiceResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxInvoiceResult_idempotencyKey_key" ON "TaxInvoiceResult"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TaxInvoiceResult_storeId_year_month_idx" ON "TaxInvoiceResult"("storeId", "year", "month");

-- AddForeignKey
ALTER TABLE "TaxInvoiceResult" ADD CONSTRAINT "TaxInvoiceResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
