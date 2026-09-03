# Dashboard 도메인 (대시보드)

## 개요

관리자(ADMIN) 전용 대시보드로 재무 지표, 차트, 수금 현황을 시각화합니다.

### 핵심 기능
- 기간별 조회 (일별/월별) + 연/월 필터
- 요약 카드: 총매출, 총비용, 미수금, 방문 수
- 차트: 매출 스택바(결제방식별), 비용 라인, 수금 상태 파이
- 전월 비교: 일별 모드의 매출 추이 차트에만 전월 같은 일자 매출을 점선 라인으로 항상 겹쳐 표시 (월별 모드는 없음. 요약 카드·클릭 상세 패널 등 다른 곳에는 전월 자료를 표시하지 않음)
- 결제방식별(현금/계좌/카드) 상세 보기
- 미수금 상위 5건 표시
- 월간 엑셀 내보내기

---

## 비즈니스 규칙

### 집계
- 수금 상태별(UNCOLLECTED/COLLECTED/CLOSED) 그룹 집계
- 결제방식별(CASH/ACCOUNT/CARD) 매출 분리 추적
- 빈 기간(데이터 없는 날/월)은 0으로 채움
- 미수금은 UNCOLLECTED 레코드만 집계 (`RecordItem.amount` 기준)
- **총매출/매출 차트는 `RecordItem.salesAmount`(매출 원금) 기준**. 수금 처리로 amount가 0/이월 이동되어도 매출은 원래 방문 날짜에 남는다
  - 과거 데이터는 백필하지 않았으므로 `SALES_AMOUNT_CUTOVER_DATE`(`src/lib/sales-utils.ts`) 이전 기록은 기존처럼 amount로 집계 (SQL `CASE` 분기)
  - 이월 수금 항목(`이월 수금 (YYYY-MM-DD)`)은 salesAmount = 0이라 매출에 중복 집계되지 않음

### 전월 비교 (매출 차트 전용)
- 일별 모드(`period=daily&month=`)면 API가 **항상** 전월(1월이면 전년 12월) 같은 일자 매출을 `chart[]`에 함께 반환한다. 선택 옵션 없음. 월별 모드는 두 필드 모두 `null`
- 응답 `chart[].compareRevenue`: 전월 같은 일자 매출. 전월에 없는 날짜(예: 3/31 ↔ 2월)는 `null` → 라인 끊김
- 응답 `chart[].compareLabel`: 전월 같은 일자 라벨 `"MM/DD"` (예: `"08/03"`). 차트 툴팁에서 점선 시리즈명 대신 이 값을 표기 ("xx년 xx월"이 아닌 날짜). 범례는 "전월"
- 전월 자료는 매출 추이 차트에만 쓴다. 총매출 카드 증감률, 클릭 상세 패널 등에는 표시하지 않는다
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
    └── use-dashboard.ts        # TanStack Query (period/year/month 파라미터)
```

---

## 관련 API

- `GET /api/admin/dashboard` - 대시보드 데이터 (period, year, month 쿼리. 일별 모드는 전월 비교 포함)
- `POST /api/admin/export/monthly` - 월간 엑셀 내보내기

---

## 관련 페이지

- `/admin/dashboard` - 대시보드
