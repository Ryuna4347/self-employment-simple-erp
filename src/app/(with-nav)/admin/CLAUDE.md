# Admin 도메인 (관리자 기능)

## 개요

관리자(ADMIN) 전용 기능을 제공하는 도메인입니다.

### 핵심 기능
- 대시보드: 재무 지표 시각화
- 직원 관리: 초대, 계정 관리
- 미수금 관리: 미수금 추적 및 완납 처리
- 수금 관리: 수금 확인 요청 승인/거부, 수금 이력 조회
- 비용 관리: 월별 비용 CRUD, 대시보드 연동
- 공지 관리: 공지 CRUD, 만료일 설정
- 엑셀 내보내기: 월간 리포트 출력

---

## 접근 권한

- Role이 `ADMIN`인 사용자만 접근 가능
- 미들웨어에서 `/admin/*` 경로 보호

---

## 파일 구조

```
admin/
├── page.tsx                           # 관리자 랜딩 페이지
├── dashboard/
│   ├── page.tsx
│   ├── components/
│   │   ├── dashboard-content.tsx
│   │   └── index.ts
│   └── hooks/
│       └── use-dashboard.ts
├── staff/
│   ├── page.tsx
│   ├── components/
│   │   ├── staff-content.tsx
│   │   ├── staff-card.tsx
│   │   ├── invite-modal.tsx
│   │   ├── remove-staff-modal.tsx
│   │   └── index.ts
│   └── hooks/
│       └── use-staff.ts
├── outstanding/
│   ├── page.tsx
│   ├── components/
│   │   ├── outstanding-content.tsx
│   │   ├── outstanding-card.tsx
│   │   ├── store-outstanding-card.tsx
│   │   └── index.ts
│   └── hooks/
│       └── use-outstanding.ts
├── collections/
│   ├── page.tsx
│   ├── components/
│   │   ├── collections-content.tsx
│   │   ├── collection-requests-tab.tsx
│   │   ├── collection-request-card.tsx
│   │   ├── collection-history-tab.tsx
│   │   └── collection-history-card.tsx
│   └── hooks/
│       └── use-collections.ts
├── costs/
│   ├── page.tsx
│   ├── components/
│   │   ├── costs-content.tsx
│   │   ├── cost-card.tsx
│   │   ├── cost-modal.tsx
│   │   ├── delete-cost-modal.tsx
│   │   ├── recurring-cost-card.tsx
│   │   ├── recurring-cost-modal.tsx
│   │   └── index.ts
│   └── hooks/
│       ├── use-costs.ts
│       └── use-recurring-costs.ts
└── notices/
    ├── page.tsx
    ├── components/
    │   ├── notices-content.tsx
    │   ├── notice-card.tsx
    │   ├── notice-modal.tsx
    │   ├── delete-notice-modal.tsx
    │   └── index.ts
    └── hooks/
        └── use-notices.ts
```

---

## 주요 기능

### 1. 대시보드
- 월별/연별 매출, 지출, 순이익 표시
- 미수금 상위 5개 매장 노출
- 매출/지출 추이 그래프
- 엑셀 출력

### 2. 직원 관리
- 직원 목록 (이름, 권한, 등록 상태)
- 초대 URL 생성 및 복사
- 직원 추가/제거 (soft delete)

### 3. 미수금 관리
- 미수금 목록 (월별/일별, 매장별)
- 직원 필터 (담당 매장의 assignedUserId 기준)
- 오늘 날짜의 레코드는 미수금 목록에서 제외
- 일괄 수금처리 기능 (오늘 날짜 레코드 제외, 수금 완료 시 품목 금액 0으로 설정)

### 4. 수금 관리
- 수금 확인 요청 탭: 직원이 요청한 수금 건 승인/거부 (PENDING/REJECTED 필터)
- 수금 이력 탭: 직접 수금 + 요청 기반 수금 통합 이력 (연/월/담당자/매장 필터)

### 5. 비용 관리
- 연/월별 비용 목록 조회
- 비용 CRUD (날짜, 제목, 금액, 비고)
- 고정비용 관리 (이름, 금액, 주기 설정)
- 고정비용 크론 자동 생성 (WEEKLY: 매주 월요일, MONTHLY: 매월 1일)
- 대시보드 총 비용 카드에 합산 반영

### 6. 공지 관리
- 공지 CRUD (제목, 내용, 만료일)
- 만료일 설정 (null = 무기한, 설정 시 해당일 23:59:59까지 유효)
- 만료되지 않은 최신 공지 1건이 근무기록 페이지에 배너로 표시

---

## 관련 API

- `GET /api/admin/dashboard` - 대시보드 데이터
- `GET/POST /api/admin/staff` - 직원 목록/초대
- `PUT/DELETE /api/admin/staff/[id]` - 직원 수정/삭제
- `POST /api/admin/create-invite` - 초대 코드 생성
- `GET /api/admin/outstanding` - 미수금 목록
- `PATCH /api/admin/outstanding/batch-collect` - 일괄 수금
- `GET /api/admin/collection-history` - 수금 이력
- `GET/POST /api/admin/costs` - 비용 목록/생성
- `PUT/DELETE /api/admin/costs/[id]` - 비용 수정/삭제
- `GET/POST /api/admin/recurring-costs` - 고정비용 목록/생성
- `PUT/DELETE /api/admin/recurring-costs/[id]` - 고정비용 수정/삭제
- `GET/POST /api/admin/notices` - 공지 목록/생성
- `PUT/DELETE /api/admin/notices/[id]` - 공지 수정/삭제
- `POST /api/cron/generate-recurring-costs` - 고정비용 자동 생성 (크론)
- `GET /api/notices/latest` - 최신 공지 조회 (사용자용)
- `POST /api/admin/export/monthly` - 월간 엑셀 내보내기

---

## 관련 페이지

- `/admin` - 관리자 랜딩
- `/admin/dashboard` - 대시보드
- `/admin/staff` - 직원 관리
- `/admin/outstanding` - 미수금 관리
- `/admin/collections` - 수금 관리
- `/admin/costs` - 비용 관리
- `/admin/notices` - 공지 관리
