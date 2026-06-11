# 코드 리팩토링 계획서

> 2026-06-10 전수 분석 결과. **이 문서의 항목은 모두 코드 변경만으로 해결되며 운영 DB에는 영향이 없다.**
> 운영 DB 스키마/데이터 변경이 필요한 항목은 [`DB_CHANGE_PROPOSAL.md`](./DB_CHANGE_PROPOSAL.md)로 분리했으며, 해당 항목은 사용자 동의 후에만 진행한다.
> (문서 위치 참고: `docs/`는 `.gitignore`상 로컬 보관 폴더라 저장소 공유를 위해 루트에 두었다.)

## 분석 범위

- API 라우트 42개 (`src/app/api/**`)
- 프론트엔드 기능 폴더 8개 (`src/app/(with-nav)/**`), 공통 컴포넌트/훅
- 공유 라이브러리 (`src/lib/**`), 인증 (`src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`)
- Prisma 스키마/마이그레이션 26개 (DB 변경 필요 항목은 별도 문서)

---

## P1 — 우선 처리 (실질적 위험 또는 큰 유지보수 비용)

### R-1. `.env.example` 정비 + 환경변수 검증 유틸
- **문제**: 실제 코드가 사용하는 환경변수가 `.env.example`에 누락되어 신규 환경 구축 시 런타임에야 실패한다.
  - `SUPABASE_SERVICE_ROLE_KEY` — `src/lib/supabase.ts:10`에서 `!` 단언으로 사용, 예시 파일에 없음
  - `CRON_SECRET` — `src/app/api/cron/generate-recurring-costs/route.ts:21`
  - `SEED_PASSWORD` — `prisma/seed.ts:10`
- **반대로 죽은 변수**: `TAX_INVOICE_API_KEY`(세금계산서 기능은 마이그레이션 `20260508120000`에서 제거됨), `NEXT_PUBLIC_SUPABASE_ANON_KEY`(코드 사용처 없음, 서버는 service role만 사용)
- **제안**: `.env.example` 갱신 + `src/lib/env.ts` 검증 유틸 추가(필수 변수 부재 시 기동 시점에 명확한 에러), `supabase.ts`의 `!` 단언 제거.

### R-2. seed 스크립트 운영 가드
- **문제**: `prisma/seed.ts`가 `SEED_PASSWORD`만 있으면 어떤 DB에든 `testuser` 계정을 upsert한다. 운영 `DATABASE_URL`이 잡힌 셸에서 실수로 실행되면 운영 DB에 테스트 계정이 생긴다.
- **제안**: `NODE_ENV === "production"` 또는 운영 호스트 패턴 감지 시 즉시 중단하는 가드 추가. (DB 변경 아님 — 코드 가드만)

### R-3. 죽은 코드/설정 제거
| 대상 | 증거 |
|---|---|
| `package.json:10-11`의 `import-stores`, `generate-store-template` 스크립트 | 참조하는 `scripts/`가 `.gitignore:54`로 로컬 보관이라 저장소에 없음 → 새로 클론한 환경(CI, 원격 세션)에서는 해당 npm script가 항상 실패. 스크립트를 커밋하거나 로컬 전용임을 README에 명시 (단순 삭제는 로컬 워크플로를 깨뜨릴 수 있어 보류) |
| `src/lib/get-token.ts:25` `getTokenDirect`, `getTokenFromRequest` | 프로젝트 전체에서 호출처 0곳 |
| `src/lib/get-session.ts:22` `getSessionFromJWT` | 호출처 0곳 |
| `src/app/(with-nav)/work-records/components/user-filter.tsx` | `@/components/common/user-filter` 재export 1줄짜리 중간 계층 |
| `.env.example`의 `TAX_INVOICE_API_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | R-1 참조 |

### R-4. TanStack Query 키 중앙화
- **문제**: 동일 쿼리 키가 파일마다 재정의되어 invalidate 불일치 위험이 크다.
  - `DASHBOARD_KEY = ["admin", "dashboard"]`가 **7개 파일**에 중복 정의 (`use-daily-cost.ts:21`, `use-work-records.ts:119`, `use-batch-collect.ts:7`, `use-collections.ts:110`, `use-dashboard.ts:72`, `use-outstanding.ts:77`, `use-costs.ts:33`)
  - 키 계층 규칙 부재: `["admin","costs"]`(2단) vs `["daily-cost"]`(1단) vs `["work-records"]`(1단) 혼용
  - `use-stores.ts` 등에서 `["admin"]` 광범위 무효화 → 불필요한 리페치
- **제안**: `src/lib/query-keys.ts` 단일 모듈로 키 팩토리 도입, 모든 훅이 이를 import. invalidate 대상도 키 모듈 기준으로 정리.

### R-5. 비대 컴포넌트 분해 (work-records 중심)
- `work-record-modal.tsx` **707줄** — 폼 + 매장 검색 드롭다운 + 이미지 업로드 + 품목 동적 배열이 한 파일. → `StoreSearchSection` / `ImageUploadSection` / 품목 필드 배열로 분리
- `work-record-card.tsx` **529줄** — 축약/상세 모드 + 미수 배지 + 수금 버튼 로직 혼재 → 모드별 서브컴포넌트 + `OutstandingBadge` 분리
- `store-modal.tsx` **450줄**, `work-records-client.tsx` **319줄**(모달 7개 상태 관리) → 모달 상태는 `useWorkRecordsModals()` 훅으로 추출
- **효과**: 회귀 빈발 영역(AGENTS.md 명시: API↔프론트 shape 불일치)의 변경 영향 범위 축소.

### R-6. `work-records/route.ts` 서비스 레이어 분리
- **문제**: GET 핸들러 포함 **437줄**. 목록 조회 + summary 집계 + 매장별 미수 집계 + PENDING 요청 맵 구성이 한 함수에 있다 (`src/app/api/work-records/route.ts:44-336`).
- **제안**: `src/lib/services/work-records.ts`로 `buildDailySummary`, `buildStoreOutstandingMap`, `buildPendingRequestMap` 추출. 기존 `src/lib/reports/daily-cash-collection.ts` 패턴과 동일한 방식.

---

## P2 — 구조 개선 (동작은 정상, 확장 시 비용 증가)

### R-7. 미수금/요약 집계의 메모리 로드 제거 (코드만, 기존 인덱스 활용)
- **문제**: `src/app/api/admin/outstanding/route.ts:100-122` — 건수·합계 계산을 위해 조건에 맞는 **전체 레코드+품목을 로드 후 JS reduce**. 매장별 필터(`:180-199`)도 동일. 페이지 쿼리는 DB 페이지네이션을 쓰고 있어 문제는 요약 쿼리뿐.
- **제안**: 건수는 `prisma.workRecord.count({ where })`, 합계는 `prisma.recordItem.aggregate({ _sum: { amount: true }, where: { workRecord: { ... } } })`로 대체. 기존 `(collectionStatus, date)` 인덱스로 충분 — **DB 변경 불필요.**
- 같은 패턴: `work-records/route.ts`의 summary 집계(`:187-211`).

### R-8. 공통 유틸 추출
- `items.reduce((sum, i) => sum + i.amount, 0)` 합계 패턴이 5곳 이상 (`admin/outstanding/route.ts:40-42`에 이미 `calcTotalAmount` 존재 — `src/lib/collection-utils.ts`로 승격)
- `format(toKSTLocal(d), "yyyy-MM-dd")` 패턴 반복 → `date-utils.ts`에 `formatKSTDate()` 추가
- 무한 스크롤 IntersectionObserver 보일러플레이트 3곳 중복 (`stores-client.tsx`, `store-templates-client.tsx:60-76`, `work-records-client.tsx:77-93`) → `src/hooks/use-infinite-scroll.ts`

### R-9. CRUD 모달 공통 패턴 추출
- `cost-modal.tsx`(178줄), `notice-modal.tsx`(162줄), `store-modal.tsx`, `store-template-modal.tsx`가 동일 골격(open 시 reset / create·update 분기 / ResponsiveModal 래핑)을 반복.
- **제안**: 공통 래퍼 + `useCrudForm` 훅으로 골격 추출. 단, 모달별 도메인 필드는 그대로 유지(과도한 추상화 금지).
- 참고: `store-template-modal.tsx:179`처럼 `eslint-disable` 정당화 주석이 있는 reset 패턴은 프로젝트 규칙상 허용된 형태이므로, 공통화 시 한 곳에서만 정당화하면 된다.

### R-10. API 응답 타입 공통화
- 각 훅마다 `{ data: T }` 래퍼 인터페이스를 재정의 (`CostsResponse`, `NoticeListResponse`, `StoresResponse` …).
- **제안**: `src/types/api.ts`에 `ApiResponse<T>`, `PaginatedResponse<T>` 정의 후 공용화. API 응답 shape 변경 시 단일 지점 수정.

### R-11. zod 스키마 배치 정리
- `src/lib/validations.ts`에는 `passwordSchema`뿐이고 나머지 스키마는 각 라우트에 산재. 라우트 전용 스키마는 라우트 옆이 자연스러우나, **여러 라우트가 공유하는 스키마**(날짜 쿼리, 페이지네이션 쿼리, 금액)는 중앙화 가치가 있다.
- **제안**: `paginationQuerySchema`, `yearMonthQuerySchema`, `amountSchema`를 `validations.ts`로 모으고 라우트는 `.extend()`로 확장.

### R-12. cron 인증 헬퍼
- `cron/generate-recurring-costs/route.ts:18-32`의 수동 Bearer 검증을 `auth-guard.ts`의 `requireCronAuth()`로 추출 (가드 일관성).

---

## P3 — 정리 수준 (여유 있을 때)

| # | 항목 | 위치 |
|---|---|---|
| R-13 | `NextResponse.json()` 직접 사용을 `apiSuccess()`로 통일 | `admin/outstanding/route.ts:141,242` 등 |
| R-14 | 대시보드 고유 매장 수: `findMany+distinct` → `groupBy` | `admin/dashboard/route.ts:87-91` |
| R-15 | `monthly-report.ts` 435줄 — 시트 구성 단계별 함수 분할 | `src/lib/excel/monthly-report.ts` |
| R-16 | React Compiler(`reactCompiler: true`) 환경에서 단순 계산 `useMemo` 정리 | `daily-cash-collection-modal.tsx:27-30` 등 |
| R-17 | `auth.ts` ↔ `auth.config.ts` 역할(Edge 분리) 주석 보강, 세션 콜백의 매 요청 DB 조회는 의도(role 즉시 반영)임을 명시 | `src/auth.ts:72-83` |

---

## 분석 중 오탐으로 판정한 항목 (조치 불필요)

- ~~store-templates PUT/DELETE 권한 상승~~ — API가 `requireAdmin()`을 쓰는 것은 UI와 일치하는 의도된 설계 (`store-template-card.tsx:129`에서 수정/삭제 버튼이 `isAdmin`일 때만 노출).
- ~~upload 라우트 파일명 미검증~~ — 원본 파일명을 쓰지 않고 `userId/timestamp-random.ext`로 재생성하므로 안전 (`api/upload/route.ts`).
- ~~트랜잭션 누락~~ — 수금 승인, 직원 삭제, 템플릿 수정 등 다중 쓰기는 모두 `$transaction` 사용 중.
- 날짜/KST 처리 — `date-utils.ts` 유틸이 API 전반에서 일관되게 사용되고 있음.

## 권장 진행 순서

1. **R-1~R-3** (반나절): 위험 제거 + 죽은 코드 정리 — 회귀 위험 거의 없음
2. **R-4, R-8, R-10** (1일): 키/유틸/타입 중앙화 — 이후 작업의 기반
3. **R-7, R-12** (반나절): 집계 쿼리 최적화 + 가드 정리
4. **R-5, R-6, R-9** (2~3일): 구조 분해 — 회귀 테스트(QA 체크리스트) 동반 필수
5. P3 항목은 위 작업에 끼워서 처리
