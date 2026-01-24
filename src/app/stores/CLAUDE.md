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

### StoreItem (매장별 템플릿)
- `name`: 품명
- `unitPrice`: 기본 단가
- `quantity`: 기본 수량

---

## 비즈니스 규칙

- 매장 삭제 시 StoreItem, WorkRecord 함께 삭제 (Cascade)
- kakaoPlaceId는 unique (중복 등록 방지)
- 근무기록 생성 시 StoreItem 자동 로드

---

## 관련 페이지

- `/stores` - 매장 목록 (아코디언 카드)
- `/stores/[id]` - 매장 상세/수정
