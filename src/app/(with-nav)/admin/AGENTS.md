# Admin 도메인 (관리자 기능)

## 개요

관리자(ADMIN) 전용 기능을 제공하는 도메인입니다. VIEWER도 관리자 화면에 접근할 수 있지만 읽기 전용으로만 사용합니다.

### 핵심 기능
- 대시보드: 매출, 비용, 미수금 통계와 차트
- 직원 관리: 초대, 계정 관리, soft delete
- 미수금 관리: 매장별 미수금 추적과 일괄 수금 처리
- 수금 관리: 수금 확인 요청 승인/거부와 수금 이력 조회
- 비용 관리: 월별 비용 CRUD와 고정비용 관리
- 공지 관리: 공지 CRUD와 만료일 설정
- 엑셀 내보내기: 월간 리포트 출력

## 접근 권한

- `ADMIN` 또는 `VIEWER` 역할 사용자가 접근 가능합니다.
- `VIEWER`는 읽기 전용입니다. 쓰기 버튼은 렌더링하지 않고 `canWrite()`로 보호합니다.
- 미들웨어에서 `/admin/*` 경로를 보호합니다.

## 파일 구조

```
admin/
├── page.tsx
├── dashboard/
├── staff/
├── outstanding/
├── collections/
├── costs/
└── notices/
```

## 주요 기능

### 1. 대시보드
- 월별/일별 매출, 지출, 순이익 표시
- 미수금 상위 매장 표시
- 매출/지출 추이 차트
- 엑셀 출력

### 2. 직원 관리
- 직원 목록 조회
- 초대 URL 생성 및 복사
- 직원 추가/삭제

### 3. 미수금 관리
- 월별/일별 미수금 목록 조회
- 직원 필터
- 오늘 날짜 레코드는 미수금 목록에서 제외
- 일괄 수금 처리

### 4. 수금 관리
- 직원이 요청한 수금 건 승인/거부
- 직접 수금과 요청 기반 수금 이력 통합 조회

### 5. 비용 관리
- 월별 비용 목록 조회
- 비용 CRUD
- 고정비용 관리와 스케줄 기반 자동 생성
- 대시보드 비용 합산 반영

### 6. 공지 관리
- 공지 CRUD
- 만료일 설정
- 사용자 화면 최신 공지 배너 표시

## 관련 API

- `GET /api/admin/dashboard`
- `GET/POST /api/admin/staff`
- `DELETE /api/admin/staff/[id]`
- `POST /api/admin/create-invite`
- `GET /api/admin/outstanding`
- `PATCH /api/admin/outstanding/batch-collect`
- `GET /api/admin/collection-history`
- `GET/POST /api/admin/costs`
- `PUT/DELETE /api/admin/costs/[id]`
- `GET/POST /api/admin/recurring-costs`
- `PUT/DELETE /api/admin/recurring-costs/[id]`
- `GET/POST /api/admin/notices`
- `PUT/DELETE /api/admin/notices/[id]`
- `POST /api/cron/generate-recurring-costs`
- `GET /api/notices/latest`
- `POST /api/admin/export/monthly`

## 관련 페이지

- `/admin`
- `/admin/dashboard`
- `/admin/staff`
- `/admin/outstanding`
- `/admin/collections`
- `/admin/costs`
- `/admin/notices`
