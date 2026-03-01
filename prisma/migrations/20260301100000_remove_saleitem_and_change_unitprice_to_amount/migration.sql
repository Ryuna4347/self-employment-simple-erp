-- SaleItem 테이블 삭제
DROP TABLE "SaleItem";

-- WorkRecord 관련 데이터 전체 삭제 (RecordItem 먼저 삭제 - FK 제약)
DELETE FROM "RecordItem";
DELETE FROM "WorkRecord";

-- RecordItem: unitPrice → amount 리네임
ALTER TABLE "RecordItem" RENAME COLUMN "unitPrice" TO "amount";

-- StoreItem: amount = unitPrice * quantity 계산 후 컬럼 교체
ALTER TABLE "StoreItem" ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 0;
UPDATE "StoreItem" SET "amount" = "unitPrice" * "quantity";
ALTER TABLE "StoreItem" DROP COLUMN "unitPrice";
