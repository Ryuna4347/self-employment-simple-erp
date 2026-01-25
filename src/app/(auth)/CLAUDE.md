# Auth 도메인 (인증/회원 관리)

## 개요

사용자 인증, 회원 관리, 초대 시스템을 담당하는 도메인입니다.

### 핵심 기능
- Auth.js v5 기반 ID/PW 인증 (Credentials Provider + JWT 세션)
- 로그인 상태 유지 (Remember Me): Refresh Token + iron-session 이중 쿠키 시스템
- 권한 분리: 관리자(ADMIN) / 일반 사원(USER)
- 초대 시스템: 관리자가 생성한 초대 링크로 회원가입

---

## 데이터 모델

### User
- `loginId`: 로그인 아이디 (최소 4자)
- `password`: 비밀번호 (null이면 초대 대기 상태)
- `role`: 권한 (ADMIN / USER)
- `inviteCode`: 초대 코드 (등록 완료 시 null)
- `isDeleted`: 퇴사자 여부 (soft delete)

---

## 비즈니스 규칙

### 인증
- password가 null이거나 isDeleted가 true면 로그인 불가
- 비밀번호는 bcrypt로 해싱

### 로그인 상태 유지 (Remember Me)
- **체크 시**: 7일 Refresh Token + iron-session 쿠키 (슬라이딩 갱신)
- **미체크 시**: 브라우저 닫으면 로그아웃 (iron-session 세션 쿠키)
- **보안**: Token Rotation + Token Reuse Attack 탐지

### 초대 시스템
1. 관리자가 직원 이름으로 초대 생성
2. 직원이 초대 URL로 접속하여 회원가입
3. loginId, password 설정 후 등록 완료

### 권한
- **ADMIN**: 모든 기능 접근
- **USER**: 근무기록, 매장조회, 템플릿 관리

---

## 관련 페이지

- `/` - 로그인 페이지
- `/register?code=...` - 회원가입 페이지
- `/admin/staff` - 직원 관리 (Admin)
