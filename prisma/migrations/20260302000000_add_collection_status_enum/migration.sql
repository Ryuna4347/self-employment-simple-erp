-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('UNCOLLECTED', 'COLLECTED', 'CLOSED');

-- AlterTable: 새 컬럼 추가
ALTER TABLE "WorkRecord" ADD COLUMN "collectionStatus" "CollectionStatus" NOT NULL DEFAULT 'UNCOLLECTED';
ALTER TABLE "WorkRecord" ADD COLUMN "imageUrl" TEXT;

-- 기존 데이터 마이그레이션
UPDATE "WorkRecord" SET "collectionStatus" = 'COLLECTED' WHERE "isCollected" = true;
UPDATE "WorkRecord" SET "collectionStatus" = 'UNCOLLECTED' WHERE "isCollected" = false;

-- 기존 컬럼 제거
ALTER TABLE "WorkRecord" DROP COLUMN "isCollected";
