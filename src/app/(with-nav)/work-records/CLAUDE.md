# WorkRecord 도메인 (근무기록)

## 개요

일별 방문 기록과 거래 내역을 관리하는 핵심 도메인입니다.

### 핵심 기능
- 근무/방문 기록 CRUD
- 거래 품목 스냅샷 저장 (RecordItem)
- 매장 정보 스냅샷 저장 (거래 시점 보존)
- 수금 상태 관리
- 매장 템플릿 자동 로드

---

## 데이터 모델

### WorkRecord (방문 기록)
- `date`: 방문 날짜
- `storeId`: 방문 매장 (nullable - 직접 입력 시 null)
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
- `amount`: 금액
- `quantity`: 수량

---

## 비즈니스 규칙

### 스냅샷 원칙
- RecordItem은 저장 시점의 데이터를 독립 보관
- 매장 정보도 스냅샷으로 보관 (storeNameSnapshot 등)
- 원본 변경/삭제되어도 기록 유지

### 금액 계산
- totalAmount는 DB 저장 안 함
- `SUM(amount)`로 실시간 계산

### 수금 관리
- `collectionStatus: UNCOLLECTED` → 미수금
- `collectionStatus: COLLECTED` → 수금완료
- `collectionStatus: CLOSED` → 휴업&폐업

### 중복 방지
- 동일 날짜 + 동일 매장 근무기록 중복 등록 방지
- 코스(템플릿) 적용 시 기존 레코드가 있으면 건너뛰기

### 정렬
- 코스 적용 시 `sortOrder`에 `StoreTemplateMember.order` 값 반영

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

---

## 관련 페이지

- `/work-records` - 근무기록 메인 (캘린더 + 리스트)
- 근무 추가/수정 모달
