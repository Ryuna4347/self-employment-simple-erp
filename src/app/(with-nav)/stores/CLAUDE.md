# Store 도메인 (매장 관리)

## 개요

매장 기본 정보와 매장별 템플릿 품목을 관리하는 도메인입니다.

### 핵심 기능
- 매장 정보 CRUD (명칭, 주소, 담당자, 결제방식)
- 매장별 기본 품목 템플릿 관리 (StoreItem)
- 카카오맵 API 연동 (주소 검색, 좌표 저장)

---

## 데이터 모델

### Store
- `name`: 매장명
- `address`: 주소
- `managerName`: 담당자 (현금 결제 시 입금자)
- `PaymentType`: 결제 방식 (CASH / ACCOUNT / CARD)
- `kakaoPlaceId`: 카카오맵 장소 ID
- `latitude` / `longitude`: 좌표
- `receiptType`: 영수증 발급 종류 (NONE / SIMPLE_RECEIPT / TRANSACTION_STATEMENT)
- `assignedUserId`: 담당 사원 ID
- `isDeleted`: 소프트 삭제 여부 (default: false)

### StoreItem (매장별 템플릿)
- `name`: 품명
- `amount`: 금액
- `quantity`: 기본 수량

---

## 비즈니스 규칙

- 매장 삭제 시 소프트 삭제 (isDeleted: true). StoreItem, WorkRecord는 보존
- 매장 수정 시 연결된 WorkRecord의 스냅샷(storeNameSnapshot, storeAddressSnapshot) 동기화
- kakaoPlaceId는 unique (중복 등록 방지)
- 근무기록 생성 시 StoreItem 자동 로드

---

## 관련 페이지

- `/stores` - 매장 목록 (아코디언 카드, 인라인 수정)
