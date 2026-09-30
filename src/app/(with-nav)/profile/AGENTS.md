# Profile 도메인 (프로필 관리)

## 개요

사용자 프로필 정보 조회 및 비밀번호 변경 기능을 제공하는 도메인입니다.

### 핵심 기능
- 사용자 정보 표시 (이름, 아이디, 권한)
- 비밀번호 변경
- 이 기기 설정: 주소 탭 동작 변경/해제

---

## 비즈니스 규칙

### 주소 탭 동작 (이 기기 설정)
- 매장/근무기록 카드의 주소를 **터치 기기**(`(pointer: coarse)`)에서 눌렀을 때의 동작
  - 저장값 없음: 선택 시트 표시 (카카오맵 / 네이버지도 / 주소 복사 + "선택 기억하기")
  - 저장값 있음: 해당 동작 바로 실행
- 데스크톱(터치 아님) — **임시** (`DESKTOP_ADDRESS_SHEET_ENABLED`, `src/lib/map-links.ts`)
  - 저장값 없음: 선택 시트 표시 (네이버지도 / 주소 복사 + "선택 기억하기"). 카카오맵은 숨김
  - 지도는 앱 대신 네이버지도 웹을 새 탭으로 연다. 저장값이 `kakao`여도 네이버지도 웹으로 연다
  - 플래그를 `false`로 바꾸면 기존 동작(설정과 무관하게 항상 주소 복사)으로 돌아간다
- **DB 저장 안 함** — `localStorage`의 `address-action-preference` 키 (기기·브라우저별)
- 설정 값: `매번 선택`(키 삭제) / `kakao` / `naver` / `copy`
- 지도 앱은 주소 문자열 검색으로 연다. Android는 인텐트 URL(미설치 시 웹 지도), iOS는 커스텀 스킴(미열림 시 "웹에서 열기" 토스트)
- 관련 코드: `src/lib/map-links.ts`, `src/hooks/use-address-action-preference.ts`, `src/components/providers/address-action-provider.tsx`

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
│   ├── address-action-setting.tsx  # 주소 탭 동작 설정 (localStorage)
│   └── index.ts
└── hooks/
    └── use-change-password.ts
```

---

## 관련 API

- `PATCH /api/profile/password` - 비밀번호 변경

---

## 관련 페이지

- `/profile` - 프로필 페이지 (비밀번호 변경, 이 기기 설정)
