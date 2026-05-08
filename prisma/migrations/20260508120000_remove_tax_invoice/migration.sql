-- DropForeignKey
ALTER TABLE "Store" DROP CONSTRAINT IF EXISTS "Store_taxPartyId_fkey";
ALTER TABLE "TaxInvoiceResult" DROP CONSTRAINT IF EXISTS "TaxInvoiceResult_storeId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Store_taxPartyId_idx";

-- AlterTable
ALTER TABLE "Store" DROP COLUMN IF EXISTS "taxPartyId";
ALTER TABLE "Store" DROP COLUMN IF EXISTS "taxInvoiceEnabled";

-- DropTable
DROP TABLE IF EXISTS "TaxInvoiceResult";
DROP TABLE IF EXISTS "TaxParty";

-- DropEnum
DROP TYPE IF EXISTS "TaxInvoiceStatus";
