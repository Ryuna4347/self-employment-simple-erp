# Store 도메인 (매장 관리)

## 개요

매장 기본 정보와 매장별 기본 품목을 관리하는 도메인입니다.

### 핵심 기능
- 매장 정보 CRUD (매장명, 주소, 담당자, 결제방식)
- 매장별 기본 품목 템플릿 관리
- 주소 검색: Kakao 우편번호 서비스 임베드 (`src/components/common/address-search-dialog.tsx`, `src/lib/postcode.ts`)
- 좌표/장소ID(`latitude`/`longitude`/`kakaoPlaceId`) 필드는 있으나 입력 UI는 미구현

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

### 주소 입력
- 매장 모달의 주소 칸 옆 "주소 검색" 버튼 → Kakao 우편번호 서비스(무료, 키 없음)를 다이얼로그에 임베드 (모바일 풀스크린)
- 선택 결과는 사용자가 고른 타입(도로명/지번)의 **기본 주소만** 저장 (`getSelectedAddress`). 건물명·참고항목은 붙이지 않고, 층·호수는 사용자가 뒤에 직접 입력
- 열 때 입력돼 있던 주소를 검색어로 전달 (`q`)
- 주소 칸은 직접 입력도 계속 허용 (검색 실패/네트워크 오류 시 대비)
- 스크립트: `https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js` (동적 로드, `window.kakao`/`window.daum` 동일 객체)

## 파일 구조

```
stores/
├── page.tsx
├── components/
│   ├── store-card.tsx
│   ├── store-modal.tsx      # 주소 칸 + "주소 검색" 버튼 (AddressSearchDialog)
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
