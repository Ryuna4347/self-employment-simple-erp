# Profile 도메인 (프로필 관리)

## 개요

사용자 프로필 정보 조회 및 비밀번호 변경 기능을 제공하는 도메인입니다.

### 핵심 기능
- 사용자 정보 표시 (이름, 아이디, 권한)
- 비밀번호 변경

---

## 비즈니스 규칙

### 비밀번호 변경
- 현재 비밀번호 확인 필수
- 새 비밀번호: 최소 8자, 영문+숫자+특수문자(@$!%*?&)
- bcrypt 해싱 (salt rounds: 10)

---

## 파일 구조

```
profile/
├── page.tsx
├── components/
│   ├── profile-content.tsx
│   ├── change-password-modal.tsx
│   └── index.ts
└── hooks/
    └── use-change-password.ts
```

---

## 관련 API

- `PATCH /api/profile/password` - 비밀번호 변경

---

## 관련 페이지

- `/profile` - 프로필 페이지 (비밀번호 변경)
