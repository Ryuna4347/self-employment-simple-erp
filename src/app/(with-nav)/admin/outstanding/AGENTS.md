# Outstanding 도메인 (미수금 관리)

## 개요

관리자(ADMIN) 전용 미수금 추적 및 수금 처리 기능입니다.

### 핵심 기능
- 날짜별/매장별 두 가지 뷰 모드
- 담당자(assignedUserId) 필터
- 매장명/입금자 검색
- 2달 이상 장기 미수 필터 + 상단 알림 배너 (매장별 뷰)
- 개별/일괄 수금처리
- 무한 스크롤 페이지네이션

---

## 뷰 모드

### 1. 날짜별 보기
- 연/월 선택 후 해당 기간의 미수금 레코드 조회
- 플랫 리스트 형태

### 2. 매장별 보기
- 전체 기간의 미수금을 매장 단위로 그룹핑
- 매장별 미수금 합계 내림차순 정렬
- 매장 상세 정보 표시 (주소, 담당자, 결제방식)
- "2달 이상 장기 미수만 보기" 체크박스(`agedOnly`) 제공

---

## 장기 미수 (2달 이상)

- **기준**: KST 기준 오늘로부터 2달 전(`subMonths(startOfDayKST(), 2)`)보다 `date`가 **이전**인 미수금 레코드
- **필터**: 매장별 뷰에서만 `agedOnly=true` 지원. 날짜별 뷰는 미지원
- **알림 배너**: 페이지 상단에 장기 미수 매장 수를 표시. `useAgedOutstandingCount`가 `filter=store&agedOnly=true&limit=1`로 매장 수(`pagination.totalCount`)만 경량 조회 (`staleTime` 30초)
  - 배너는 `agedCount > 0`이고 현재 뷰가 "매장별 + agedOnly"가 아닐 때만 노출
  - "확인하기" 버튼 → 매장별 뷰 + `agedOnly` 활성화로 전환
- `agedOnly` 활성 시에만 URL 쿼리(`agedOnly=true`)에 동기화

---

## 비즈니스 규칙

### 미수금 필터
- `collectionStatus: UNCOLLECTED`인 레코드만 대상
- 오늘 날짜 레코드 포함 (날짜 제한 없음 — 등록 즉시 미수금/일괄 수금 대상)
- 요약 카드: 총 미수금 금액 + 건수

### 수금 처리
- 개별: WorkRecord의 collectionStatus 토글
- 일괄: 매장 그룹 단위로 일괄 수금 처리

### 페이지네이션
- 100건 단위 무한 스크롤
- 필터 상태 URL 쿼리 파라미터에 동기화

---

## 파일 구조

```
outstanding/
├── page.tsx
├── components/
│   ├── outstanding-content.tsx      # 메인 컨텐츠 (필터 + 뷰 토글)
│   ├── outstanding-card.tsx         # 날짜별 미수금 카드
│   ├── store-outstanding-card.tsx   # 매장별 미수금 그룹 카드
│   └── index.ts
└── hooks/
    └── use-outstanding.ts           # useInfiniteQuery + 장기 미수 수 조회 + 수금 토글/일괄 처리
```

주요 훅 (`use-outstanding.ts`):
- `useOutstanding(params)` - 미수금 목록 무한 스크롤 (날짜별/매장별)
- `useAgedOutstandingCount()` - 장기 미수 매장 수만 경량 조회 (알림 배너용)
- `useToggleCollection()` / `useBatchToggleCollection()` - 개별/일괄 수금 토글

---

## 관련 API

- `GET /api/admin/outstanding` - 미수금 목록 (필터, 페이지네이션)
  - `filter=date`: `year`, `month`, `userId?`, `search?`
  - `filter=store`: `storeName?`, `userId?`, `agedOnly?` (2달 이상 장기 미수)
- `POST /api/admin/outstanding/batch-collect` - 일괄 수금

---

## 관련 페이지

- `/admin/outstanding` - 미수금 관리
- `/admin/collections` - 수금 관리 (수금 이력)
