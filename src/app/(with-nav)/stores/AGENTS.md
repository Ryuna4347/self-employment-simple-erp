# Store 도메인 (매장 관리)

## 개요

매장 기본 정보와 매장별 기본 품목을 관리하는 도메인입니다.

### 핵심 기능
- 매장 정보 CRUD (매장명, 주소, 담당자, 결제방식)
- 매장별 기본 품목 템플릿 관리
- 주소 검색: Kakao 우편번호 서비스 임베드 (`src/components/common/address-search-dialog.tsx`, `src/lib/postcode.ts`)
- 매장 검색(상호 검색): Kakao 로컬 키워드 장소 검색 → 주소·좌표·장소ID(`kakaoPlaceId`) 저장 (`KAKAO_REST_API_KEY` 있을 때만)

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
- `kakaoPlaceId`는 unique입니다. 매장 POST/PUT은 저장 전에 `ensureKakaoPlaceAvailable`(`src/lib/store-place.ts`)로 확인합니다.
  - 다른 **활성** 매장이 같은 장소에 연결돼 있으면 409 (`이미 등록된 매장입니다 (매장명)`)
  - **삭제된** 매장이 같은 장소를 갖고 있으면 삭제 매장의 `kakaoPlaceId`만 null로 풀고 진행 (삭제 후 재등록 허용)
  - PUT은 장소 연결을 새 값으로 바꿀 때만 확인
- 근무기록 생성 시 StoreItem을 자동 로드합니다.
- 계좌 결제(`ACCOUNT`)인 경우 입금자 입력이 필수입니다.

### 주소 입력
- 매장 모달의 주소 칸 옆 "주소 검색" 버튼 → Kakao 우편번호 서비스(무료, 키 없음)를 다이얼로그에 임베드 (모바일 풀스크린)
- 선택 결과는 사용자가 고른 타입(도로명/지번)의 **기본 주소만** 저장 (`getSelectedAddress`). 건물명·참고항목은 붙이지 않고, 층·호수는 사용자가 뒤에 직접 입력
- 열 때 입력돼 있던 주소를 검색어로 전달 (`q`)
- 주소 칸은 직접 입력도 계속 허용 (검색 실패/네트워크 오류 시 대비)
- 스크립트: `https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js` (동적 로드, `window.kakao`/`window.daum` 동일 객체)
- 주소 검색으로 주소를 바꾸면 기존 장소 연결(`kakaoPlaceId`/좌표)은 해제됩니다 (다른 위치를 가리킬 수 있으므로)

### 매장 검색 (상호 검색)
- 매장명 옆 "매장 검색" 버튼 → `PlaceSearchDialog` → `GET /api/places/search?query=&excludeStoreId=`
- **기능 플래그**: 서버 환경변수 `KAKAO_REST_API_KEY` 유무 (`isPlaceSearchEnabled()`를 `stores/page.tsx`에서 호출해 prop으로 전달). 키가 없으면 버튼이 렌더링되지 않고 API는 503 `FEATURE_DISABLED`
- 키는 서버에서만 사용 (`NEXT_PUBLIC_` 금지). 클라이언트는 `@/lib/kakao-local`에서 **타입만** import
- API는 `requireWriteAccess` (VIEWER 차단), 검색어 1~100자, 클라이언트는 2글자 이상·300ms 디바운스·5분 캐시로 호출 (외부 쿼터 절약)
- 선택 시: 매장명이 **비어 있을 때만** 장소명으로 채움, 주소는 도로명 우선(없으면 지번), `kakaoPlaceId`·`latitude`·`longitude` 저장
- 이미 같은 장소로 등록된 활성 매장은 결과에 "이미 등록된 매장" 표시 + 선택 불가 (수정 중인 매장 자신은 제외)
- 모달에 "카카오맵 장소 연결됨" 표시 + "연결 해제" (null로 저장)
- Kakao 오류 매핑: 쿼터 초과(429 / code -10) → 503, 키 오류(401/403) → 502, 그 외·타임아웃(5초) → 502
- 무료 쿼터: 키워드 장소 검색 일 100,000건 (개발자 계정 기준 **첫 번째** 카카오맵 API 활성화 앱만), 초과 시 비즈월렛 유료 설정 필요(2원/건)

## 파일 구조

```
stores/
├── page.tsx
├── components/
│   ├── store-card.tsx
│   ├── store-modal.tsx      # 매장명 + "매장 검색", 주소 + "주소 검색", 장소 연결 표시
│   ├── place-search-dialog.tsx  # 매장 검색 (상호 → Kakao 장소)
│   ├── stores-client.tsx
│   └── index.ts
└── hooks/
    ├── use-stores.ts
    └── use-place-search.ts  # GET /api/places/search
```

## 관련 API

- `GET/POST /api/stores`
- `GET/PUT/DELETE /api/stores/[id]`
- `GET /api/places/search` - 매장 검색 (Kakao 키워드 장소 검색 프록시)

## 관련 페이지

- `/stores`
