# WorkRecord 도메인 (근무기록)

## 개요

일별 방문 기록과 거래 내역을 관리하는 핵심 도메인입니다.

### 핵심 기능
- 근무/방문 기록 CRUD
- 거래 품목 스냅샷 저장 (RecordItem)
- 매장 정보 스냅샷 저장 (거래 시점 보존)
- 수금 상태 관리 (미수금/수금완료/휴업&폐업)
- 수금 확인 요청 (CollectionRequest)
- 일일 비용 기록
- 일괄 삭제
- 매장 템플릿 자동 로드
- 일괄 수금처리
- 드래그앤드롭 순서 변경 (@dnd-kit)
- 공지 배너 표시 (최신 공지 1건)

---

## 데이터 모델

### WorkRecord (방문 기록)
- `date`: 방문 날짜
- `storeId`: 방문 매장 (신규 생성 시 **필수** — 기존 매장 선택만 허용. 컬럼은 과거 직접입력 레거시 레코드 보존을 위해 nullable 유지)
- `userId`: 작성자
- `collectionStatus`: 수금 상태 (UNCOLLECTED/COLLECTED/CLOSED)
- `imageUrl`: 이미지 URL (Supabase Storage)
- `note`: 영업 메모
- `storeNameSnapshot`: 매장명 스냅샷
- `storeAddressSnapshot`: 주소 스냅샷
- `managerNameSnapshot`: 담당자 스냅샷
- `paymentTypeSnapshot`: 거래 당시 결제 방식
- `sortOrder`: 코스 적용 시 정렬 순서 (default: 0)

### RecordItem (거래 상세 - 스냅샷)
- `name`: 품목명
- `amount`: 현재 잔액(수금 장부). 수금 처리 시 0, 이월 수금 시 마지막 건으로 이동
- `salesAmount`: 매출 원금. 저장 시 `toRecordItemData()`(`src/lib/sales-utils.ts`)로 amount와 동일하게 기록, 수금 처리로 변하지 않음. 이월 수금 항목은 0
- `quantity`: 수량
- **금액 기재 관행**: 대부분의 기록은 최상위(첫 번째) 품목 1개에 기록 전체 합계 금액을 적고, 나머지 품목은 0원으로 두어 자재(매트 사이즈·기름걸레 등) 배치 수량만 기록한다. 항상 그런 것은 아니며 품목별로 금액을 적는 기록도 있다 (2026-09-03 기준 품목 2개 이상 기록 62건 중 61건이 최상위 합계 방식). 0원 품목은 정상 데이터이며 수금 처리 결과가 아니다. 품목 순서는 생성 순서(id ASC = 폼의 위→아래)

---

## 비즈니스 규칙

### 스냅샷 원칙
- RecordItem은 저장 시점의 데이터를 독립 보관
- 매장 정보도 스냅샷으로 보관 (storeNameSnapshot 등)
- 원본 변경/삭제되어도 기록 유지

### 금액 계산
- totalAmount는 DB 저장 안 함
- `SUM(amount)`로 실시간 계산 (근무기록 화면의 매출/수금/미수 표시는 amount 기준 유지)
- 품목 생성 경로(생성/수정/템플릿 적용/이월 수금)는 모두 `salesAmount`를 함께 저장해야 한다
- 수정(PUT)은 기존 품목을 삭제 후 재생성하므로 `toRecordItemDataPreservingSales()`로 매출 원금을 보존한다 (수금 처리로 amount가 0이 된 기록을 어드민이 수정해도 매출이 사라지지 않도록)
  - 1단계 품목 단위: 품목명이 같고 amount가 바뀌지 않은 항목은 기존 `salesAmount` 유지, 신규/금액 변경 항목은 `salesAmount = amount`
  - 2단계 기록 단위: 기록의 amount 합계가 그대로인데(재가격 아님) 1단계에서 매출 원금이 빠졌다면(최상위 합계 품목의 이름 변경/삭제 등) 빠진 금액을 첫 번째 일반 품목에 더해 기록 합계를 유지. 위 금액 기재 관행(최상위 품목에 합계)을 반영한 것이며, 품목별 금액 기록은 1단계에서 각자 매칭되므로 영향 없음

### 수금 관리
- `collectionStatus: UNCOLLECTED` → 미수금
- `collectionStatus: COLLECTED` → 수금완료
- `collectionStatus: CLOSED` → 휴업&폐업

### 중복 방지
- 동일 날짜 + 동일 매장 근무기록 중복 등록 방지
- 코스(템플릿) 적용 시 기존 레코드가 있으면 건너뛰기

### 정렬
- 코스 적용 시 `sortOrder`에 `StoreTemplateMember.order` 값 반영
- 드래그앤드롭으로 본인의 해당 날짜 근무기록 순서 변경 가능
- 트랜잭션으로 일괄 업데이트

---

## 파일 구조

```
work-records/
├── page.tsx
├── types.ts                         # DailySummary 등 타입 정의
├── components/
│   ├── work-records-client.tsx      # 메인 클라이언트 컴포넌트
│   ├── calendar-header.tsx          # 캘린더 헤더 (날짜 선택)
│   ├── work-record-list.tsx         # 근무기록 리스트
│   ├── work-record-card.tsx         # 근무기록 카드 (아코디언)
│   ├── work-record-modal.tsx        # 근무기록 추가/수정 모달
│   ├── daily-stats.tsx              # 일별 통계 (방문수, 매출, 수금)
│   ├── store-visit-history.tsx      # 매장 방문 이력 (lazy load)
│   ├── fab-menu.tsx                 # FAB 메뉴 (추가 액션)
│   ├── template-apply-modal.tsx     # 템플릿 적용 모달
│   ├── collection-request-modal.tsx # 수금 확인 요청 모달
│   ├── daily-cost-modal.tsx         # 일일 비용 기록 모달
│   ├── bulk-delete-modal.tsx        # 일괄 삭제 모달
│   ├── notice-banner.tsx            # 공지 배너 (최신 공지 표시)
│   └── user-filter.tsx              # 유저 필터 (관리자용)
└── hooks/
    ├── use-work-records.ts          # 근무기록 CRUD
    ├── use-store-visits.ts          # 매장 방문 이력 조회
    ├── use-store-uncollected.ts     # 매장별 미수금 조회
    ├── use-batch-collect.ts         # 일괄 수금처리
    ├── use-collection-request.ts    # 수금 확인 요청
    ├── use-daily-cost.ts            # 일일 비용 기록
    └── use-latest-notice.ts         # 최신 공지 조회
```

---

## 주요 컴포넌트/훅

### 매장 방문 이력 (StoreVisitHistory)
- 카드 확장 시 최근 6개월 방문 이력 표시 (lazy load)
- CLOSED 상태 제외, 현재 날짜 제외
- API: `GET /api/work-records/store-visits?storeId=...`
- Hook: `useStoreVisits`

### 일별 통계 (DailyStats)
- 방문 수, 총매출, 수금완료/미수금 금액 표시
- 결제방식별(현금/계좌/카드) 색상 구분
- 타입: `DailySummary` (types.ts)

### 유저 필터
- 관리자가 직원별 근무기록 필터링 가능
- 공통 `UserFilter` 컴포넌트 사용 (`src/components/common/user-filter.tsx`)

### 수금 확인 요청 (CollectionRequestModal)
- 직원이 미수금 레코드를 선택하여 관리자에게 수금 확인 요청
- Hook: `useCollectionRequest`

### 일일 비용 기록 (DailyCostModal)
- 일일 비용(유류비 등)을 Expense로 기록
- API: `POST /api/expenses/daily-cost`
- Hook: `useDailyCost`

### 일괄 삭제 (BulkDeleteModal)
- 선택한 근무기록을 일괄 삭제
- API: `POST /api/work-records/bulk`

### 공지 배너 (NoticeBanner)
- 만료되지 않은 최신 공지 1건을 리스트 상단에 배너로 표시
- API: `GET /api/notices/latest`
- Hook: `useLatestNotice`

### 드래그앤드롭 정렬
- @dnd-kit 사용하여 근무기록 순서 변경
- 본인의 해당 날짜 레코드만 변경 가능
- API: `PATCH /api/work-records/reorder`

---

## 성능 관련 구현

- **모달 지연 로드**: 추가/수정, 코스 적용, 전체/선택 삭제, 주유비/차량수리비, 수금 확인 요청, 전날 현금 수금 모달은 `next/dynamic` + `MountOnFirstOpen`으로 처음 열 때 마운트한다. 목록을 그린 뒤 유휴 시간에 청크를 미리 받는다 (`preloadOnIdle`, 로더 함수는 `dynamic()`과 공유)
- **모달 조회는 열려 있을 때만**: 근무기록 모달의 전체 매장 목록은 추가 모드에서만(`enabled: open && !editRecord`), 코스 적용 모달의 직원/코스 목록은 `enabled: open`. FAB 메뉴를 열면 세 목록을 미리 조회(`prefetchQuery`)해 모달을 열자마자 표시한다
- **첫 마운트 초기화 주의**: 근무기록 모달은 `open=true`로 처음 마운트될 수 있어, 휴업&폐업 해제 시 이미지 초기화는 "CLOSED → 다른 상태" 전환에서만 실행한다 (첫 마운트 때 기존 첨부 이미지를 지우면 저장 요청에 `imageUrl: null`이 실려 서버 이미지가 삭제됨)
- **카드 상세 지연 렌더링**: 카드 상세 영역은 처음 펼칠 때 렌더링하고 이후 유지한다 (최대 100건 목록의 초기 렌더 비용 절감, 휴업&폐업 첨부 이미지는 펼칠 때 다운로드 + `loading="lazy"`)
- **업로드 전 이미지 압축**: 첨부 이미지는 선택 시 브라우저에서 긴 변 1600px JPEG(품질 0.8)로 압축한다 (`src/lib/image-compression.ts`). 원본은 20MB까지 선택 가능하며, 업로드 API 제한(5MB)은 압축 후 크기 기준
- **검색**: 매장명 검색은 0.5초 디바운스. 같은 날짜·담당자에서 검색어만 바뀌면 새 결과가 올 때까지 이전 목록을 흐리게 유지한다 (`placeholderData`, `aria-busy`)
- **이전 목록 표시 중 쓰기 차단**: 이전 목록(placeholder)을 보여 주는 동안에는 드래그 정렬을 끄고(`canReorder`에 `!isPlaceholderData`) FAB의 삭제 모드 진입 버튼을 숨긴다. 검색어를 지운 직후 이전 검색 결과만 보이는 상태에서 정렬하면 일부 기록의 순서만 저장되어 순서가 겹치고, 전체 삭제는 새 필터 기준으로 실행되는데 건수는 이전 목록 기준으로 보이기 때문
- **삭제 선택은 현재 목록 기준**: 선택 수·전체 선택·선택 삭제 대상은 지금 목록에서 선택 가능한 기록으로 거른 값(`visibleSelectedIds`)을 쓴다. 재조회로 목록에서 사라진 기록이 선택에 남아 함께 삭제 요청되지 않도록
- **정렬 캐시 동기화**: 드래그 정렬 시 목록 캐시(`["work-records", { date, userId }]`)도 새 순서로 바꾼다 (성공 시 재조회 없음, 실패 시 무효화로 서버 순서 복원)
- **달력 지연 로드**: 날짜 선택 달력(react-day-picker)은 헤더를 펼칠 때 필요하므로 지연 로드한다

---

## 관련 API

- `GET/POST /api/work-records` - 목록/생성
- `GET/PUT/DELETE /api/work-records/[id]` - CRUD
- `POST /api/work-records/[id]/save-store` - 매장 저장 (레거시: storeId=null 기록 정리용. 신규 생성은 매장 선택 필수라 정상 플로우에서는 사용 안 함)
- `GET /api/work-records/store-visits` - 방문 이력
- `GET /api/work-records/store-uncollected` - 미수금 조회
- `GET /api/work-records/daily-cash-collection?date=YYYY-MM-DD` - 특정 날짜의 직원별 현금 수금 집계 (ADMIN 전용)
- `PATCH /api/work-records/batch-collect` - 일괄 수금
- `PATCH /api/work-records/reorder` - 순서 변경
- `GET/POST /api/collection-requests` - 수금 요청
- `POST /api/collection-requests/[id]/approve` - 승인
- `POST /api/collection-requests/[id]/reject` - 거부
- `POST /api/work-records/bulk` - 일괄 삭제
- `POST /api/expenses/daily-cost` - 일일 비용
- `GET /api/notices/latest` - 최신 공지

---

## 관련 페이지

- `/work-records` - 근무기록 메인 (캘린더 + 리스트)
- 근무 추가/수정 모달
- 수금 확인 요청 모달
- 일일 비용 기록 모달
- 일괄 삭제 모달
- 템플릿 적용 모달

## 추가 파일

- `src/app/(with-nav)/work-records/components/daily-cash-collection-modal.tsx` - 전날 직원별 현금 수금 모달 (ADMIN 전용)
- `src/app/(with-nav)/work-records/hooks/use-daily-cash-collection.ts` - 전날 현금 수금 조회 훅
