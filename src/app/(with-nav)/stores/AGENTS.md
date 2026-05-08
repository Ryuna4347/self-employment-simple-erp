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
- `taxInvoiceEnabled`: 세금계산서 발급 대상 여부
- `taxPartyId`: 연결된 TaxParty ID
- `taxParty`: 연결된 사업자 마스터 정보
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
- 세금계산서 발급 대상 체크박스는 결제 방식이 `CASH` 또는 `ACCOUNT`일 때만 렌더링
- 결제 방식을 `CARD`로 변경해도 `taxInvoiceEnabled` 값을 자동 초기화하지 않음. 다시 `CASH`/`ACCOUNT`로 돌아오면 기존 체크 상태를 보존
- 사업자등록번호, 대표자명, 업태, 종목, 세금계산서 이메일, 발급 담당자는 Store에서 제거되고 TaxParty에서 관리
- 매장 모달의 사업자 선택 autocomplete는 `ADMIN`에게만 렌더링
- `USER`는 매장 모달에서 사업자 영역을 볼 수 없으며 기존 `taxPartyId` 값을 보존
- 매장 카드 펼침 영역의 사업자 정보 readonly 표시는 `ADMIN`, `VIEWER`에게만 렌더링

---

## 파일 구조

```
stores/
├── page.tsx
├── components/
│   ├── stores-client.tsx   # 메인 클라이언트 컴포넌트 (목록 + 모달 상태)
│   ├── store-card.tsx      # 매장 카드 (아코디언)
│   ├── store-modal.tsx     # 매장 추가/수정 모달
│   ├── tax-party-autocomplete.tsx # 사업자 검색/선택 autocomplete
│   └── index.ts
└── hooks/
    └── use-stores.ts       # 매장 CRUD
```

---

## 관련 API

- `GET/POST /api/stores` - 매장 목록/생성
- `GET/PUT/DELETE /api/stores/[id]` - 매장 CRUD
- `GET /api/tax-parties/search` - 사업자 autocomplete 검색

---

## 관련 페이지

- `/stores` - 매장 목록 (아코디언 카드, 인라인 수정)
