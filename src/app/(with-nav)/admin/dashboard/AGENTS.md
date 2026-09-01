# Dashboard 도메인 (대시보드)

## 개요

관리자(ADMIN) 전용 대시보드로 재무 지표, 차트, 수금 현황을 시각화합니다.

### 핵심 기능
- 기간별 조회 (일별/월별) + 연/월 필터
- 요약 카드: 총매출, 총비용, 미수금, 방문 수
- 차트: 매출 스택바(결제방식별), 비용 라인, 수금 상태 파이
- 결제방식별(현금/계좌/카드) 상세 보기
- 미수금 상위 5건 표시
- 월간 엑셀 내보내기

---

## 비즈니스 규칙

### 집계
- 수금 상태별(UNCOLLECTED/COLLECTED/CLOSED) 그룹 집계
- 결제방식별(CASH/ACCOUNT/CARD) 매출 분리 추적
- 빈 기간(데이터 없는 날/월)은 0으로 채움
- 미수금은 UNCOLLECTED 레코드만 집계
- 최근 미수금은 오늘 날짜 제외
- 추가/제거 매장 카운트 및 목록은 근무기록 1건 이상 보유 매장만 포함 (등록만 된 빈 매장 제외)

### 시간대
- 모든 날짜 계산에 KST(한국 표준시) 사용

---

## 파일 구조

```
dashboard/
├── page.tsx
├── components/
│   ├── dashboard-content.tsx   # 메인 뷰 (필터 + 차트 + 카드)
│   └── index.ts
└── hooks/
    └── use-dashboard.ts        # TanStack Query (period/year/month/compare 파라미터)
```

---

## 관련 API

- `GET /api/admin/dashboard` - 대시보드 데이터 (period, year, month, compare 쿼리)
- `POST /api/admin/export/monthly` - 월간 엑셀 내보내기

---

## 관련 페이지

- `/admin/dashboard` - 대시보드

## 매출 그래프 데이터 출처

매출 추이 차트는 원장(WorkRecord/RecordItem) 직접 집계가 아니라
`getDailySalesSeries()` (`src/lib/reports/daily-sales.ts`)를 통해 읽는다.

수금 처리가 과거 `RecordItem.amount` 를 0 으로 덮어쓰기 때문이다
(`consolidateAndCollect`, 미수금 일괄 수금). 그래서 매일 밤 크론
(`/api/cron/daily-sales-snapshot`, 00:10 KST)이 그날 매출을
`DailySalesSnapshot` 에 고정하고, 차트는 **스냅샷이 있으면 스냅샷을,
없으면 원장 계산값을** 쓴다.

- `summary.totalRevenue` 도 같은 시리즈에서 도출해 차트 합계와 일치시킨다.
  단 `outstandingAmount` 는 현재 상태값이라 원장에서 그대로 읽는다.
- `compare` 파라미터로 비교 시리즈를 함께 받는다.
  - 일별 모드: `prevMonth`(전월 같은 일자) / `prevYear`(전년 같은 월·일)
  - 월별 모드: `prevYear` 만 유효, `prevMonth` 는 무시된다
  - 대응되는 날이 없으면(31일 ↔ 30일 등) `compareRevenue` 는 `null`
- 크론 가동 이전 구간은 스냅샷이 없어 여전히 부정확할 수 있다(백필 미실시).
