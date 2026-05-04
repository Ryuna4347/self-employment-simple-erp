# Register 도메인 (회원가입)

## 개요

초대 링크를 통한 직원 셀프 회원가입 기능입니다.

### 핵심 기능
- 초대 코드 검증
- 아이디/비밀번호 설정
- 가입 완료 후 로그인 페이지 자동 이동

---

## 가입 흐름

1. **초대 링크 접속**: `/register?code={encodedCode}`
2. **코드 검증**: POST `/api/register/verify` → 이름, userId 반환
3. **폼 입력**: 이름(읽기 전용), 아이디, 비밀번호 입력
4. **가입 완료**: POST `/api/register/complete` → 2초 후 로그인 페이지 리다이렉트

---

## 비즈니스 규칙

### 초대 코드
- 인코딩된 코드에서 이름 + inviteCode 추출
- DB에서 inviteCode + name 일치 확인
- 유효 조건: 사용자 존재, isDeleted: false, password: null (미등록)

### 아이디
- 중복 불가 (전체 사용자 대상)

### 비밀번호
- 최소 8자, 영문 + 숫자 + 특수문자(@$!%*?&)
- bcrypt 해싱 (cost factor 10)
- 한글 입력 방지 (koreanToEnglish 필터)

### 가입 완료 시
- loginId, password(해시) 설정
- inviteCode를 null로 변경 → 등록 완료 상태

---

## 파일 구조

```
register/
└── page.tsx    # RegisterPage → RegisterForm → RegisterFormWithCode
                # 3단계 상태: loading → form → success
```

---

## 관련 API

- `POST /api/register/verify` - 초대 코드 검증 (이름 + userId 반환)
- `POST /api/register/complete` - 회원가입 완료 (비밀번호 해싱, inviteCode 초기화)

---

## 관련 페이지

- `/register?code=...` - 회원가입 페이지
- `/` - 로그인 페이지 (가입 후 리다이렉트)
- `/admin/staff` - 초대 링크 생성
