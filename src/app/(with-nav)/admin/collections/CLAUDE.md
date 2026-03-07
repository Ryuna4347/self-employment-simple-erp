# Collections 도메인 (수금 관리)

## 개요

관리자(ADMIN) 전용 수금 관리 기능입니다. 직원의 수금 확인 요청을 처리하고, 수금 이력을 조회합니다.

### 핵심 기능
- 수금 확인 요청 처리 (승인/거부)
- 수금 이력 조회 (직접 수금 + 요청 기반 수금 통합)

---

## 탭 구성

### 1. 수금 확인 요청 탭
- 상태 필터: PENDING (대기), REJECTED (거부)
- 펼침 카드: 요청 상세 + 승인/거부 버튼
- 무한 스크롤 페이지네이션

### 2. 수금 이력 탭
- 연/월 선택, 담당자 필터, 매장명 검색
- 직접 수금 / 요청 기반 수금 두 유형 표시
- 펼침 카드: 품목별 상세 내역

---

## 데이터 모델

### CollectionRequest
- `storeId`, `storeNameSnapshot`, `requesterId`, `status` (PENDING/APPROVED/REJECTED)
- `reviewerId`, `reviewedAt`, `note`

### CollectionRequestItem
- `collectionRequestId`, `workRecordId`
- WorkRecord와 N:M 관계

---

## 관련 페이지

- `/admin/collections` - 수금 관리
- `/admin/outstanding` - 미수금 관리
