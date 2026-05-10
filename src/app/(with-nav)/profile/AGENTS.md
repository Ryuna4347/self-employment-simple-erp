# Profile 도메인 (프로필 관리)

## 개요

사용자 프로필 정보 조회 및 비밀번호 변경 기능을 제공하는 도메인입니다.

### 핵심 기능
- 사용자 정보 표시 (이름, 아이디, 권한)
- 비밀번호 변경
- 휴대폰 번호 변경 (ADMIN 전용)

---

## 비즈니스 규칙

### 비밀번호 변경
- 현재 비밀번호 확인 필수
- 새 비밀번호: 최소 8자, 영문+숫자+특수문자(@$!%*?&)
- bcrypt 해싱 (salt rounds: 10)

### 휴대폰 번호 변경 (ADMIN 전용)
- 문자메시지(일일 현금 수금 보고) 수신처
- 형식: 010-XXXX-XXXX 또는 01012345678 (저장 시 하이픈 제거)
- USER/VIEWER에는 노출하지 않음

---

## 파일 구조

```
profile/
├── page.tsx
├── components/
│   ├── profile-content.tsx
│   ├── change-password-modal.tsx
│   ├── change-phone-modal.tsx       # 휴대폰 번호 변경 (ADMIN 전용)
│   └── index.ts
└── hooks/
    ├── use-change-password.ts
    ├── use-phone-number.ts          # 휴대폰 번호 조회
    └── use-change-phone.ts          # 휴대폰 번호 변경
```

---

## 관련 API

- `PATCH /api/profile/password` - 비밀번호 변경
- `GET /api/profile/phone` - 휴대폰 번호 조회 (ADMIN 전용, 문자메시지 수신처)
- `PATCH /api/profile/phone` - 휴대폰 번호 변경 (ADMIN 전용)

---

## 관련 페이지

- `/profile` - 프로필 페이지 (비밀번호 변경, ADMIN 휴대폰 번호 변경)
