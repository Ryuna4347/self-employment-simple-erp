# Expense 도메인 (지출 관리)

## 개요

업무 관련 지출(유류비, 식비 등)을 기록하고 관리하는 도메인입니다.

### 핵심 기능
- 지출 내역 CRUD
- 날짜/카테고리별 지출 조회
- 대시보드 재무 지표에 반영

---

## 데이터 모델

### Expense
- `date`: 지출 발생 날짜 (사용자 입력)
- `userId`: 작성자
- `title`: 지출 제목 (예: "유류비", "식대")
- `amount`: 지출 금액
- `description`: 비고 (선택)
- `createdAt`, `updatedAt`: 자동 관리

---

## 비즈니스 규칙

### 지출 기록
- 본인 지출만 작성/수정/삭제
- 관리자는 모든 사용자 지출 조회 가능

### 재무 계산
- 순이익 = 총 매출 - 총 지출

---

## 구현 상태

> **미구현**: 사용자용 `/expenses` 페이지 UI는 아직 구현되지 않음 (CLAUDE.md만 존재).
> 유류비 기록은 `/work-records`의 유류비 모달에서 `POST /api/expenses/fuel-cost`로 처리.
> 관리자용 비용 관리는 `/admin/costs`에서 구현됨.

---

## 관련 API

- `POST /api/expenses/fuel-cost` - 유류비 기록 (구현됨)

---

## 관련 페이지

- `/expenses` - 사용자용 지출 목록 (미구현)
- `/admin/costs` - 관리자용 비용 관리 (구현 완료)
- `/admin/dashboard` - 대시보드 재무 지표
