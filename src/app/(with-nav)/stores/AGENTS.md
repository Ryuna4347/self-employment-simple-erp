# Store 도메인 (매장 관리)

## 개요

매장 기본 정보와 매장별 기본 품목을 관리하는 도메인입니다.

### 핵심 기능
- 매장 정보 CRUD (매장명, 주소, 담당자, 결제방식)
- 매장별 기본 품목 템플릿 관리
- 카카오맵 API 연동 (주소 검색, 좌표 저장)

## 데이터 모델

### Store
- `name`: 매장명
- `address`: 주소
- `managerName`: 입금자
- `PaymentType`: 결제 방식 (`CASH` / `ACCOUNT` / `CARD`)
- `kakaoPlaceId`: 카카오맵 장소 ID
- `latitude` / `longitude`: 좌표
- `receiptType`: 영수증 발급 종류 (`NONE` / `SIMPLE_RECEIPT` / `TRANSACTION_STATEMENT`)
- `assignedUserId`: 담당 사원 ID
- `isDeleted`: soft delete 여부

### StoreItem
- `name`: 품목명
- `amount`: 금액
- `quantity`: 기본 수량

## 비즈니스 규칙

- 매장 삭제 시 soft delete(`isDeleted: true`) 처리합니다. StoreItem과 WorkRecord는 보존합니다.
- 매장 수정 시 연결된 WorkRecord의 스냅샷(`storeNameSnapshot`, `storeAddressSnapshot`)을 동기화합니다.
- `kakaoPlaceId`는 unique입니다.
- 근무기록 생성 시 StoreItem을 자동 로드합니다.
- 계좌 결제(`ACCOUNT`)인 경우 입금자 입력이 필수입니다.

## 파일 구조

```
stores/
├── page.tsx
├── components/
│   ├── store-card.tsx
│   ├── store-modal.tsx
│   ├── stores-client.tsx
│   └── index.ts
└── hooks/
    └── use-stores.ts
```

## 관련 API

- `GET/POST /api/stores`
- `GET/PUT/DELETE /api/stores/[id]`

## 관련 페이지

- `/stores`
