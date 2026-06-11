# 운영 DB 변경 제안서 (승인 필요)

> 2026-06-10 전수 분석에서 발견된 항목 중 **운영 PostgreSQL 스키마/데이터 변경이 필요한 것만** 모았다.
> **이 문서의 어떤 항목도 사용자 승인 없이는 실행하지 않는다.** 항목별로 독립 승인/보류가 가능하다.
> 코드만으로 해결되는 항목은 [`REFACTORING_PLAN.md`](./REFACTORING_PLAN.md) 참조.

## 공통 안전 절차 (모든 항목에 적용)

1. 실행 직전 `pg_dump`로 전체 백업 확보
2. 마이그레이션은 `prisma migrate dev`로 파일 생성 → 스테이징(또는 로컬 복제 DB)에서 검증 → 운영에는 `prisma migrate deploy`
3. 락이 발생하는 항목(DB-4, DB-5)은 `MAINTENANCE_MODE=true` 점검 모드에서 실행 (미들웨어가 전 요청 차단 — 이미 구현되어 있음)
4. 실행 후 `prisma migrate status`로 적용 확인

> ⚠️ 전제: 운영 DB가 마이그레이션 히스토리(26개)를 모두 적용한 상태라고 가정했다. DB-1이 바로 이 가정이 깨져 있다는 증거이므로, **어떤 항목을 진행하든 DB-0(현황 확인)을 먼저 한다.**

---

## DB-0. 사전 현황 확인 (변경 아님, 읽기 전용)

운영 DB에서 아래만 확인 (데이터 변경 없음):

```sql
-- RefreshToken 실제 컬럼 구성 (DB-1 판단 근거)
SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'RefreshToken';
-- Clone 테이블 데이터 보유 여부 (DB-4 판단 근거)
SELECT (SELECT count(*) FROM "StoreClone") AS stores,
       (SELECT count(*) FROM "WorkRecordClone") AS records,
       (SELECT count(*) FROM "RecordItemClone") AS items;
-- 소프트 삭제된 매장 중 kakaoPlaceId 점유 건수 (DB-3 판단 근거)
SELECT count(*) FROM "Store" WHERE "isDeleted" = true AND "kakaoPlaceId" IS NOT NULL;
```

---

## DB-1. RefreshToken 스키마 드리프트 해소 — **권장: 긴급**

### 배경 (검증 완료)
스키마와 마이그레이션이 서로 다른 테이블을 정의하고 있다.

| 컬럼 | 마이그레이션 `20260124145610` (= 실제 운영 DB) | `schema.prisma:142-153` |
|---|---|---|
| `familyId` | ✅ 존재, **NOT NULL** + 인덱스 | ❌ 없음 |
| `revokedAt` | ✅ 존재 | ❌ 없음 |
| `rememberMe` | ❌ 없음 | ✅ `Boolean @default(false)` |

이후 어떤 마이그레이션도 이 차이를 해소하지 않았다 (`20260304000000_sync_schema_baseline`은 RefreshToken을 건드리지 않음).

### 실제 영향
- 현재 RefreshToken 사용처는 `admin/staff/[id]/route.ts:41`의 `deleteMany` 1곳뿐이라 **당장은 동작**한다.
- 그러나 Remember Me 기능(AGENTS.md에 "향후 구현 예정") 착수 시: `create`는 `familyId NOT NULL` 위반으로, `rememberMe` 접근은 "column does not exist"로 **런타임에야 실패**한다.
- `prisma migrate dev`가 드리프트를 감지하면 개발 흐름이 깨질 수 있다.

### 선택지
- **안 A (DB 변경, 권장)** — DB를 스키마에 맞춘다. 토큰 테이블은 만료성 데이터라 손실 부담이 없다.
  ```sql
  ALTER TABLE "RefreshToken" DROP COLUMN "familyId";   -- 인덱스도 함께 제거됨
  ALTER TABLE "RefreshToken" DROP COLUMN "revokedAt";
  ALTER TABLE "RefreshToken" ADD COLUMN "rememberMe" BOOLEAN NOT NULL DEFAULT false;
  ```
  단, Remember Me 설계에서 token rotation(family 단위 폐기)을 쓸 계획이면 `familyId`/`revokedAt`을 남기는 게 맞으므로 안 B가 낫다.
- **안 B (DB 무변경)** — 스키마를 DB에 맞춘다: `schema.prisma`에 `familyId String`, `revokedAt DateTime?` 추가하고 `rememberMe` 제거. **운영 DB는 건드리지 않는다.**

### 운영 영향 / 롤백
- 안 A: `ALTER TABLE`은 메타데이터 변경, 락 수 ms. 중단 불필요. 롤백 = 컬럼 재추가.
- 안 B: DB 영향 없음.
- **위험도: 낮음** (테이블이 사실상 미사용)

---

## DB-2. FK 컬럼 인덱스 추가 — **권장**

### 배경
PostgreSQL은 FK 컬럼에 인덱스를 자동 생성하지 않는다. 실제 쿼리 패턴과 대조한 결과 누락 인덱스는 다음과 같다:

| 컬럼 | 영향 받는 쿼리 | 체감도 |
|---|---|---|
| `RecordItem.workRecordId` | **모든 근무기록 목록 조회의 `include: { items }`** (Prisma가 `WHERE "workRecordId" IN (...)` 실행), WorkRecord 삭제 cascade | **높음 — 최우선** |
| `CollectionRequestItem.workRecordId` | 근무기록별 PENDING 요청 조회, WorkRecord 삭제 cascade. 기존 `@@unique([collectionRequestId, workRecordId])`는 선두 컬럼이 달라 커버 못 함 | 중간 |
| `StoreItem.storeId` | 매장 상세의 기본 품목 include, Store 삭제 cascade | 중간 |
| `StoreTemplateMember.templateId`, `storeId` | 코스 멤버 조회/일괄 삭제 (`store-templates/[id]/route.ts:114`) | 중간 |
| `Store.assignedUserId` | 직원 삭제 시 `SET NULL` 스캔 | 낮음 |
| `Notice.authorId` | author join | 낮음 |

**불필요 판정** (분석 에이전트 제안에서 제외함): `WorkRecord.userId`·`storeId`는 기존 복합 인덱스 `(userId, date)`, `(storeId, collectionStatus)`의 선두 컬럼이라 커버됨. `RefreshToken.userId`, `Expense.userId/date`는 이미 인덱스 있음.

### 제안 변경
`schema.prisma`에 `@@index` 추가 후 마이그레이션 생성:

```sql
CREATE INDEX "RecordItem_workRecordId_idx" ON "RecordItem"("workRecordId");
CREATE INDEX "CollectionRequestItem_workRecordId_idx" ON "CollectionRequestItem"("workRecordId");
CREATE INDEX "StoreItem_storeId_idx" ON "StoreItem"("storeId");
CREATE INDEX "StoreTemplateMember_templateId_idx" ON "StoreTemplateMember"("templateId");
CREATE INDEX "StoreTemplateMember_storeId_idx" ON "StoreTemplateMember"("storeId");
CREATE INDEX "Store_assignedUserId_idx" ON "Store"("assignedUserId");
CREATE INDEX "Notice_authorId_idx" ON "Notice"("authorId");
```

### 운영 영향 / 롤백
- 일반 `CREATE INDEX`는 생성 중 해당 테이블 **쓰기만** 차단(읽기 허용). 현재 데이터 규모(자영업 단일 사업장)면 테이블당 1초 미만 예상.
- 참고: `CREATE INDEX CONCURRENTLY`는 트랜잭션 안에서 실행 불가라 Prisma 마이그레이션(트랜잭션 래핑)과 충돌한다. 데이터가 커진 뒤라면 psql로 CONCURRENTLY 수동 실행 후 마이그레이션은 `IF NOT EXISTS`로 정합화하는 절차를 쓴다. **지금 규모에서는 일반 CREATE INDEX로 충분.**
- 롤백 = `DROP INDEX`. 데이터 변경 없음.
- **위험도: 매우 낮음**

---

## DB-3. `kakaoPlaceId` UNIQUE vs 소프트 삭제 충돌 — 검토 요청

### 배경
- `Store.kakaoPlaceId String? @unique` (`schema.prisma:38`) — **전역** 유니크.
- Store는 소프트 삭제(`isDeleted`/`deletedAt`)를 사용하므로, 삭제된 매장이 `kakaoPlaceId`를 계속 점유한다. 같은 카카오 장소를 재등록하면 P2002 충돌. (5월 중복 매장 병합 때는 hard delete(`20260513120100`)로 우회했음)

### 제안 변경 (안 A 권장)
- **안 A**: 전역 unique 제거 → 활성 행에만 적용되는 부분 유니크 인덱스로 교체.
  ```sql
  ALTER TABLE "Store" DROP CONSTRAINT "Store_kakaoPlaceId_key";
  CREATE UNIQUE INDEX "Store_kakaoPlaceId_active_key"
    ON "Store"("kakaoPlaceId") WHERE "isDeleted" = false;
  ```
  주의: Prisma는 부분 인덱스를 스키마 문법으로 표현하지 못하므로 `schema.prisma`에서는 `@unique`를 제거하고 마이그레이션 SQL로만 관리한다(스키마에 주석 필수). 코드에서 `kakaoPlaceId`로 `findUnique`하는 곳은 없음을 확인했다(중복 검증 로직 영향 없음).
- **안 B (변경 보류)**: 현재처럼 충돌 시 수동 처리. 재등록 요구가 실제로 없다면 보류도 합리적.

### 운영 영향 / 롤백
- 제약 교체는 수 초. 인덱스 생성 동안 쓰기 차단(짧음).
- 롤백 = 부분 인덱스 삭제 후 원래 unique 제약 재생성 (단, 그 사이 중복이 생겼다면 정리 필요).
- **위험도: 낮음~중간**

---

## DB-4. Clone 테이블 3종 정리 — **데이터 삭제 포함, 신중 승인 필요**

### 배경
- `StoreClone` / `WorkRecordClone` / `RecordItemClone` (`schema.prisma:256-316`): 5월 중복 매장 병합 작업(`20260512230246` 생성 → `20260513120000` 병합 → `20260513120100` 원본 hard delete)의 안전망으로 만든 복제 테이블.
- **현재 `src/` 코드 사용처 0곳** (전체 grep으로 확인). 병합은 완료된 상태.
- 테이블 안에는 병합 직전 복제한 운영 데이터 사본이 남아 있을 가능성이 높다 → **DROP은 영구 삭제**.

### 선택지
- **안 A**: 백업 후 제거 — `pg_dump -t '"StoreClone"' -t '"WorkRecordClone"' -t '"RecordItemClone"'`으로 덤프 보관 후:
  ```sql
  DROP TABLE "RecordItemClone";
  DROP TABLE "WorkRecordClone";
  DROP TABLE "StoreClone";
  ```
  스키마에서 모델 3개 제거 → 스키마 복잡도/향후 마이그레이션 부담 감소.
- **안 B**: 유지 — 병합 검증 기간이 더 필요하다고 판단되면 보류하고, 스키마 주석에 "병합 안전망, OO일 이후 제거 예정"만 명시.

### 운영 영향 / 롤백
- DROP TABLE 자체는 즉시. 운영 코드가 참조하지 않으므로 서비스 영향 없음.
- 롤백 = 덤프 파일 restore (백업을 안 하면 **롤백 불가**).
- **위험도: 중간 (비가역적 데이터 삭제 — 백업 필수)**

---

## DB-5. `Store.PaymentType` 컬럼명 정리 — 선택 사항

### 배경
- 유일하게 대문자로 시작하는 컬럼 (`schema.prisma:37`). 다른 모든 필드는 camelCase. 코드 전반(`stores`, `work-records`, excel 등)에 `store.PaymentType` 표기가 퍼져 있어 가독성·실수 유발.

### 선택지
- **안 A (DB 무변경, 권장)**: `@map`으로 코드 레벨만 정리.
  ```prisma
  paymentType PaymentType @default(CASH) @map("PaymentType")
  ```
  운영 DB 컬럼명은 그대로, Prisma Client에서는 `paymentType`으로 접근. 마이그레이션 불필요(빈 diff), 코드 일괄 치환만.
- **안 B (DB 변경)**: 실제 컬럼 rename.
  ```sql
  ALTER TABLE "Store" RENAME COLUMN "PaymentType" TO "paymentType";
  ```
  메타데이터 변경이라 즉시 완료되지만, **구버전 코드가 옛 컬럼명을 참조하는 배포 시간차** 문제가 있으므로 점검 모드에서 마이그레이션+배포를 동시에 해야 한다. `StoreClone.PaymentType`도 함께 처리.

### 운영 영향 / 롤백
- 안 A: 없음. / 안 B: rename 락 수 ms, 롤백 = 역방향 rename.
- **위험도: 안 A 없음 / 안 B 낮음(절차 준수 시)**

---

## 승인 요청 요약

| # | 항목 | 권장안 | DB 데이터 영향 | 위험도 |
|---|---|---|---|---|
| DB-0 | 사전 현황 확인 (읽기 전용) | 즉시 | 없음 | 없음 |
| DB-1 | RefreshToken 드리프트 해소 | 안 A(컬럼 정리) 또는 안 B(DB 무변경) | 미사용 컬럼 삭제 | 낮음 |
| DB-2 | FK 인덱스 7개 추가 | 진행 | 없음 (인덱스만) | 매우 낮음 |
| DB-3 | kakaoPlaceId 부분 유니크 | 안 A | 없음 (제약만) | 낮음~중간 |
| DB-4 | Clone 테이블 제거 | 백업 후 안 A | **사본 데이터 영구 삭제** | 중간 |
| DB-5 | PaymentType 컬럼명 | 안 A(@map, DB 무변경) | 없음 | 없음 |

각 항목은 독립적으로 승인/보류할 수 있다. 승인된 항목만 마이그레이션 파일을 작성하며, 운영 적용 전 스테이징 검증 결과를 다시 보고한다.
