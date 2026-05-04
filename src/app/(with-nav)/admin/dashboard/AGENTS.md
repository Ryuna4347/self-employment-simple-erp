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

- `GET /api/admin/dashboard` - 대시보드 데이터 (period, year, month 쿼리)
- `POST /api/admin/export/monthly` - 월간 엑셀 내보내기

---

## 관련 페이지

- `/admin/dashboard` - 대시보드
