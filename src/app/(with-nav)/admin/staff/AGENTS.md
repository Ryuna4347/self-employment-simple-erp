# Staff 도메인 (직원 관리)

## 개요

관리자(ADMIN) 전용 직원 초대 및 계정 관리 기능입니다.

### 핵심 기능
- 직원 목록 조회 (이름, 아이디, 권한, 등록 상태)
- 직원 초대 (이름 입력 → 초대 링크 생성)
- 초대 URL 클립보드 복사
- 직원 제거 (소프트 삭제)

---

## 비즈니스 규칙

### 초대 프로세스
- 초대 시 User 레코드 생성 (password: null, inviteCode: 값 존재)
- 초대 URL: `{baseUrl}/register?code={encodedCode}`
- 미등록 직원은 이름만 표시 (loginId 숨김)

### 등록 상태 판별
- `inviteCode === null` → 등록 완료
- `inviteCode !== null` → 미등록 (초대 대기)

### 삭제
- 소프트 삭제 (`isDeleted: true`)
- 삭제된 직원은 목록에서 제외

---

## 파일 구조

```
staff/
├── page.tsx
├── components/
│   ├── staff-content.tsx       # 메인 컨텐츠 (목록 + 모달)
│   ├── staff-card.tsx          # 직원 카드
│   ├── invite-modal.tsx        # 초대 모달 (2단계: 입력 → 링크)
│   ├── remove-staff-modal.tsx  # 제거 확인 모달
│   └── index.ts
└── hooks/
    └── use-staff.ts            # 직원 CRUD + 초대 생성
```

---

## 관련 API

- `GET /api/admin/staff` - 직원 목록 (삭제되지 않은 직원)
- `POST /api/admin/create-invite` - 초대 코드 생성
- `DELETE /api/admin/staff/[id]` - 직원 소프트 삭제

---

## 관련 페이지

- `/admin/staff` - 직원 관리
- `/register` - 직원 회원가입 (초대 링크)
