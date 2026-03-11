# Costs 도메인 (비용 관리)

## 개요

관리자(ADMIN) 전용 비용 관리 기능입니다. 연/월별로 업무 비용을 기록하고 조회합니다.

### 핵심 기능
- 월별 비용 목록 조회 (연/월 필터)
- 비용 CRUD (날짜, 제목, 금액, 비고)
- 대시보드 총 비용 카드에 합산 반영

---

## 데이터 모델

### Expense
- `date`: 비용 발생 날짜 (사용자 입력)
- `userId`: 작성자 (관리자)
- `title`: 비용 제목
- `amount`: 금액
- `description`: 비고 (선택)
- `createdAt`, `updatedAt`: 자동 관리 (목록에 미노출)

---

## 비즈니스 규칙

- 관리자만 비용 생성/수정/삭제 가능
- 비용 합계는 대시보드의 조회 기간에 맞춰 집계

---

## 파일 구조

```
costs/
├── page.tsx
├── components/
│   ├── costs-content.tsx       # 메인 컨텐츠
│   ├── cost-card.tsx           # 비용 카드
│   ├── cost-modal.tsx          # 비용 추가/수정 모달
│   ├── delete-cost-modal.tsx   # 비용 삭제 확인 모달
│   └── index.ts
└── hooks/
    └── use-costs.ts            # 비용 CRUD
```

---

## 관련 API

- `GET/POST /api/admin/costs` - 비용 목록/생성
- `PUT/DELETE /api/admin/costs/[id]` - 비용 수정/삭제

---

## 관련 페이지

- `/admin/costs` - 비용 관리
- `/admin/dashboard` - 대시보드 (총 비용 카드)
