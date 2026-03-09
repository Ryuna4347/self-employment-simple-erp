-- 날짜 전용 필드를 KST midnight으로 정규화
-- KST(Asia/Seoul) 기준 날짜를 추출하여 KST midnight(= 전날 15:00 UTC)으로 통일
-- 이미 KST midnight인 데이터는 변경 없음

-- Store.firstVisitDate
UPDATE "Store"
SET "firstVisitDate" = date_trunc('day', "firstVisitDate" AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

-- WorkRecord.date
UPDATE "WorkRecord"
SET "date" = date_trunc('day', "date" AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';

-- Expense.date
UPDATE "Expense"
SET "date" = date_trunc('day', "date" AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul';
