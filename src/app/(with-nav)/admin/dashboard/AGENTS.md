# Dashboard 도메인 (대시보드)

## 개요

관리자(ADMIN) 전용 대시보드로 재무 지표, 차트, 수금 현황을 시각화합니다.

### 핵심 기능
- 기간별 조회 (일별/월별) + 연/월 필터
- 요약 카드: 총매출, 총비용, 미수금, 방문 수
- 차트: 매출 스택바(결제방식별), 누적 매출 라인, 비용 라인, 수금 상태 파이
- 전월·전전월 비교: 일별 모드의 매출 추이·누적 매출 차트에만 전월·전전월 같은 일자 매출(누적)을 라인으로 항상 겹쳐 표시 (전월 청록 파선, 전전월 분홍 점선. 월별 모드는 없음. 요약 카드·클릭 상세 패널 등 다른 곳에는 비교 자료를 표시하지 않음)
- 누적 매출: 매출 추이 아래 라인 차트. 일별은 당월 누적 + 전월·전전월 같은 일자까지의 누적, 월별은 당해 연 누적. 가로축은 세 달 중 일수가 가장 많은 달 기준. `chart[]`·`compareTail[]`에서 클라이언트 파생
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

### 전월·전전월 비교 (매출 추이·누적 매출 차트 전용)
- 일별 모드(`period=daily&month=`)면 API가 **항상** 전월(1월이면 전년 12월)과 전전월(1월이면 전년 11월, 2월이면 전년 12월) 같은 일자 매출을 `chart[]`에 함께 반환한다. 선택 옵션 없음. 월별 모드는 비교 필드 모두 `null`
- 응답 `chart[].compareRevenue` / `compare2Revenue`: 전월 / 전전월 같은 일자 매출. 해당 달에 없는 날짜(예: 3/31 ↔ 2월)는 `null` → 라인 끊김
- 응답 `chart[].compareLabel` / `compare2Label`: 전월 / 전전월 같은 일자 라벨 `"MM/DD"` (예: `"08/03"`, `"07/03"`). 차트 툴팁에서 비교 시리즈명 대신 이 값을 표기 ("xx년 xx월"이 아닌 날짜). 범례는 "전월" / "전전월"
- 응답 `compareTail[]`: 전월이 당월보다 긴 달일 때(예: 9월 30일 조회 ↔ 8월 31일) 당월에 없는 일자의 전월·전전월 매출. `{ label: "31", compareRevenue, compareLabel: "08/31", compare2Revenue, compare2Label: "07/31" }` 형태로, 당월에 없는 날이라 `label`은 `"MM/DD"`가 아닌 일자 번호. 전전월에 없는 날이면 `compare2Revenue`/`compare2Label`은 `null`. 그 외에는 빈 배열이며 **누적 매출 차트에서만** 사용한다 (매출 추이 차트는 당월 일수 그대로)
  - 당월이 31일 미만이면 전월은 항상 31일이라(30일 달끼리 이웃하지 않고 2월 앞은 1월), 세 달 중 가장 긴 달은 언제나 당월 또는 전월이다. 그래서 `compareTail[]`은 전월 일자 기준으로 만든다
- 라인 스타일: 전월 `#0891b2`(청록) 파선(`4 4`), 전전월 `#db2777`(분홍) 점선(`1 3`, round cap). 결제유형(주황·초록·보라)·누적(파랑)과 다른 색이고 흰 배경 대비 3:1 이상. 분홍↔현금 초록은 적록색약에서 가까워(ΔE 6.1) 대시 패턴(선 vs 막대)으로 함께 구분한다
- 툴팁 순서: 전전월 → 전월 → 나머지(시리즈명순). `compareFirstTooltipSorter`의 `COMPARE_SORT_KEYS`(제어 문자 키)로 맨 위에 고정
- 비교 자료는 매출 추이 차트와 누적 매출 차트에만 쓴다. 총매출 카드 증감률, 클릭 상세 패널 등에는 표시하지 않는다
- 최근 미수금은 오늘 날짜 제외
- 추가/제거 매장 카운트 및 목록은 근무기록 1건 이상 보유 매장만 포함 (등록만 된 빈 매장 제외)

### 누적 매출 차트 (클라이언트 파생)
- 매출 추이 차트 바로 아래. 제목은 일별 "월 누적 매출", 월별 "연 누적 매출". `chart[].revenue`·`compareRevenue`·`compare2Revenue`와 `compareTail[]`을 컴포넌트에서 누적합(`useMemo`)으로 파생한다 (`dashboard-charts.tsx`의 `buildCumulativeChart`. 표시 구간 `visibleCount`/`compareVisibleCount`/`compare2VisibleCount`는 `dashboard-content.tsx`에서 계산해 넘김)
- 현재 기간(이번 달/올해)은 오늘(KST, `toKSTDateString`)/이번 달까지만 그리고 이후 구간은 `null`(라인 끊김). 과거 기간은 전체, 미래 기간은 그리지 않음
- **가로축은 당월/전월/전전월 중 일수가 가장 많은 달 기준**. 전월이 더 길면(예: 9월 조회 ↔ 8월 31일) `compareTail[]`만큼 축을 늘리고, 늘어난 구간은 당월 누적을 `null`로 둬 비교 라인만 이어 그린다. 그 구간의 축 라벨은 `"MM/DD"`가 아닌 일자 번호(`"31"`)
- 전월·전전월 누적(일별 모드 전용)은 각 달 같은 일자까지의 누적이며 완결된 달이므로 전체를 그린다. 단 미래 월 조회로 그 달이 이번 달이면 오늘까지만, 미래 달이면 그리지 않는다. 해당 달에 없는 날짜(예: 3/31 ↔ 2월)부터는 `null`
- 툴팁: 전전월 → 전월 행을 맨 위에. **모든 라인** 시리즈명("9월 누적"/"전월"/"전전월") 대신 해당 일자(`label`/`compareLabel`/`compare2Label`, "MM/DD")로 표기하고, 행마다 일자가 있어 중복이므로 상단 라벨 행은 숨긴다(`labelStyle={{ display: "none" }}`). 범례는 시리즈명 그대로
- 매출 추이 차트와 호버 동기화하지 않는다 (`syncId` 없음. 각 차트가 독립적으로 반응)
- 요약 카드·클릭 상세 패널은 변경 없음

### 시간대
- 모든 날짜 계산에 KST(한국 표준시) 사용

---

## 파일 구조

```
dashboard/
├── page.tsx
├── components/
│   ├── dashboard-content.tsx   # 메인 뷰 (필터 + 요약 카드 + 매장 목록). 차트·모달은 next/dynamic으로 지연 로드
│   ├── dashboard-charts.tsx    # 차트 섹션 (recharts: 매출 추이/누적 매출/비용 추이/수금 현황, 누적 데이터 파생)
│   ├── store-list-modal.tsx    # 제거/추가 매장 "더보기" 전체 목록 모달
│   └── index.ts
└── hooks/
    └── use-dashboard.ts        # TanStack Query (period/year/month 파라미터)
```

---

## 관련 API

- `GET /api/admin/dashboard` - 대시보드 데이터 (period, year, month 쿼리. 일별 모드는 전월·전전월 비교 포함)
- `POST /api/admin/export/monthly` - 월간 엑셀 내보내기

---

## 관련 페이지

- `/admin/dashboard` - 대시보드
