-- AlterTable: Expense - 비용 관리 필드 추가
ALTER TABLE "Expense" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Expense" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Expense" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Expense" ALTER COLUMN "date" DROP DEFAULT;

-- CreateIndex: Expense
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");
