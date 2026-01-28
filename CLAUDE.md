# Small-Shop ERP

자영업 간단 ERP 시스템 - Next.js 16 App Router 기반

## 개발 명령어

```bash
pnpm dev              # 개발 서버
pnpm build            # 프로덕션 빌드
pnpm lint             # 린트
pnpm prisma studio    # DB GUI
```

## 기술 스택

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js API routes
- **Database**: PostgreSQL + Prisma 7
- **Auth**: Auth.js v5 (Credentials + JWT + Refresh Token)
- **Forms**: react-hook-form + zod
- **Data Fetching**: TanStack Query (react-query) - 401 전역 처리

## 라우트 구조

```
src/app/
├── (with-nav)/       # 네비게이션 포함 (Header + BottomNav)
│   ├── layout.tsx    # 세션 검증 + 공통 레이아웃
│   ├── work-records/
│   ├── stores/
│   ├── store-templates/
│   └── admin/
├── register/         # 회원가입
├── api/              # API 라우트
└── page.tsx          # 로그인 페이지 (/)
```

## 주요 도메인

| 도메인 | 경로 | 설명 |
|--------|------|------|
| 인증 | `/`, `/register` | 로그인, 회원가입 |
| 매장 | `/stores` | 매장 정보 관리 |
| 근무기록 | `/work-records` | 방문 기록, 거래 내역 |
| 순회 템플릿 | `/store-templates` | 매장 그룹 관리 |
| 관리자 | `/admin/*` | 대시보드, 직원관리, 미수금 |

## 인증 시스템

- **로그인 상태 유지 (Remember Me)**
  - 체크 시: 7일간 자동 로그인 (Refresh Token + iron-session 슬라이딩)
  - 미체크 시: 브라우저 닫으면 로그아웃 (iron-session 세션 쿠키)
- **Sliding Session**: Access Token 1시간 (30분 미만 남았을 때 자동 갱신)
- **Token Rotation**: Refresh Token 사용 시마다 새 토큰 발급
- **이중 쿠키 시스템**: Auth.js JWT 쿠키 + iron-session 세션 체크 쿠키

### 세션 처리 흐름 (3단계)

1. **미들웨어**: `erp-session` 쿠키 체크 (브라우저 종료 감지)
2. **auth.config.ts**: `auth?.user` 존재 여부 (비로그인 차단)
3. **layout.tsx**: `session.error`, `user.id` 체크 (토큰 만료/무효화)

## 규칙

- 한글 주석 사용
- shadcn/ui (new-york 스타일)
- zod 유효성 검사
