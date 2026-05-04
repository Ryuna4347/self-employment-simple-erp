# Notices 도메인 (공지 관리)

## 개요

관리자(ADMIN) 전용 공지사항 관리 기능입니다. 공지를 생성/수정/삭제하고, 만료일을 설정할 수 있습니다.

### 핵심 기능
- 공지사항 CRUD (제목, 내용, 만료일)
- 만료일 설정 (무기한 또는 특정 날짜)
- 만료되지 않은 최신 공지 1건이 근무기록 페이지에 배너로 표시

---

## 데이터 모델

### Notice
- `title`: 공지 제목
- `content`: 공지 내용
- `expiresAt`: 만료일 (null = 무기한)
- `authorId`: 작성자 (관리자)
- `createdAt`, `updatedAt`: 자동 관리

---

## 비즈니스 규칙

### 만료일
- null이면 무기한 유효
- 설정 시 해당 날짜 23:59:59.999까지 유효
- 만료된 공지는 사용자에게 노출되지 않음

### 최신 공지 조회
- 만료되지 않은 공지 중 가장 최근 1건만 반환
- `expiresAt`이 null이거나 현재 시간보다 이후인 공지만 대상

### 접근 권한
- 공지 CRUD: 관리자만 가능
- 최신 공지 조회: 모든 인증된 사용자

---

## 파일 구조

```
notices/
├── page.tsx
├── components/
│   ├── notices-content.tsx       # 메인 컨텐츠 (목록 + 모달)
│   ├── notice-card.tsx           # 공지 카드
│   ├── notice-modal.tsx          # 공지 추가/수정 모달
│   ├── delete-notice-modal.tsx   # 공지 삭제 확인 모달
│   └── index.ts
└── hooks/
    └── use-notices.ts            # 공지 CRUD (목록 조회, 생성, 수정, 삭제)
```

---

## 관련 API

- `GET/POST /api/admin/notices` - 공지 목록/생성 (관리자)
- `PUT/DELETE /api/admin/notices/[id]` - 공지 수정/삭제 (관리자)
- `GET /api/notices/latest` - 최신 공지 1건 조회 (사용자용)

---

## 관련 페이지

- `/admin/notices` - 공지 관리
- `/work-records` - 근무기록 페이지 (공지 배너 표시)
