# StoreTemplate 도메인 (순회 코스 템플릿)

## 개요

자주 방문하는 매장 그룹을 관리하여 근무기록 생성을 간소화하는 도메인입니다.

### 핵심 기능
- 매장 그룹 템플릿 CRUD
- 방문 순서 관리
- 근무기록 일괄 생성

---

## 데이터 모델

### StoreTemplate
- `name`: 템플릿 이름 (예: "월요일 서초 코스")
- `description`: 템플릿 설명
- `userId`: 생성자

### StoreTemplateMember
- `templateId`: 소속 템플릿
- `storeId`: 참조 매장 (Live Reference)
- `order`: 방문 순서

---

## 비즈니스 규칙

### Live Reference
- 매장 정보 변경 시 템플릿에 실시간 반영

### 접근 권한
- 모든 사용자가 코스 조회/사용 가능
- 수정: 관리자 또는 코스 담당자(`userId`) 본인 / 삭제: 관리자 전용

### 담당자 이전
- 코스 수정 모달의 "코스 담당자" 선택으로 다른 직원에게 코스를 이전 (`PUT /api/store-templates/[id]`의 `ownerId`)
- 권한은 수정과 동일 (관리자 또는 본인). 현재 담당자를 다시 고르면 이전하지 않음
- 이전 대상: 활성 직원만 (삭제·초대 미완료(`password` null)·VIEWER 제외). 서버에서도 동일하게 검증
- 이전 시 매장 담당자 함께 이전 여부를 모달 안 확인 단계에서 선택 (`돌아가기` / `코스만 이전` / `매장도 함께 이전`)
  - 함께 이전 범위: 코스 내 활성 매장 중 **담당자가 기존 코스 담당자이거나 미지정**인 매장만. 다른 직원 담당 매장은 유지
  - 해당 매장이 0개면 확인 없이 코스만 이전
- 이전된 코스는 본인 필터 목록에서 빠짐 (새 담당자 필터에서 조회)

### 일괄 생성
- 템플릿 적용 시 모든 매장의 WorkRecord 일괄 생성
- 소프트 삭제된 매장은 자동 제외 (에러 메시지 표시, 나머지 정상 처리)
- 동일 날짜 + 동일 매장 중복 레코드 건너뛰기
- 생성된 WorkRecord의 `sortOrder`에 멤버 `order` 값 반영

### 유저 필터
- 코스 목록에서 생성자 기준 필터링 가능
- 공통 `UserFilter` 컴포넌트 사용 (`src/components/common/user-filter.tsx`)

---

## 파일 구조

```
store-templates/
├── page.tsx
├── components/
│   ├── store-templates-client.tsx  # 메인 클라이언트 컴포넌트
│   ├── store-template-card.tsx     # 템플릿 카드
│   ├── store-template-modal.tsx    # 템플릿 추가/수정 모달
│   └── index.ts
└── hooks/
    └── use-store-templates.ts      # 템플릿 CRUD
```

---

## 관련 API

- `GET/POST /api/store-templates` - 템플릿 목록/생성
- `GET/PUT/DELETE /api/store-templates/[id]` - 템플릿 CRUD
- `POST /api/store-templates/[id]/apply` - 템플릿 적용 (일괄 생성)

---

## 관련 페이지

- `/store-templates` - 템플릿 목록
- 템플릿 등록/수정 모달
- 근무기록 페이지의 템플릿 선택 모달
