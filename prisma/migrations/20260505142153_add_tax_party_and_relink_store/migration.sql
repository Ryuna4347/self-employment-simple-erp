-- CreateTable
CREATE TABLE "TaxParty" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bizNo" VARCHAR(10) NOT NULL,
    "representativeName" TEXT,
    "businessType" TEXT,
    "businessItem" TEXT,
    "taxInvoiceEmail" TEXT,
    "taxInvoiceContact" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxParty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxParty_bizNo_key" ON "TaxParty"("bizNo");
CREATE INDEX "TaxParty_isDeleted_idx" ON "TaxParty"("isDeleted");
CREATE INDEX "TaxParty_name_idx" ON "TaxParty"("name");

-- AlterTable: Store
ALTER TABLE "Store" DROP COLUMN "bizNo",
DROP COLUMN "representativeName",
DROP COLUMN "businessType",
DROP COLUMN "businessItem",
DROP COLUMN "taxInvoiceEmail",
DROP COLUMN "taxInvoiceContact",
ADD COLUMN "taxPartyId" TEXT;

-- CreateIndex
CREATE INDEX "Store_taxPartyId_idx" ON "Store"("taxPartyId");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_taxPartyId_fkey" FOREIGN KEY ("taxPartyId") REFERENCES "TaxParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;
