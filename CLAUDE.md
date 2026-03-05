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
- **Auth**: Auth.js v5 (Credentials + JWT)
- **Storage**: Supabase Storage (이미지 업로드)
- **Forms**: react-hook-form + zod
- **Data Fetching**: TanStack Query (react-query) - 401 전역 처리
- **DnD**: @dnd-kit (드래그앤드롭 정렬)
- **Excel**: ExcelJS (엑셀 내보내기)
- **Charts**: Recharts (차트)
- **Toast**: Sonner (토스트 알림)

## 라우트 구조

```
src/app/
├── (auth)/           # 인증 관련 문서 그룹
├── (with-nav)/       # 네비게이션 포함 (Header + BottomNav)
│   ├── layout.tsx    # 세션 검증 + 공통 레이아웃
│   ├── work-records/
│   ├── stores/
│   ├── store-templates/
│   ├── expenses/
│   ├── profile/
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
| 경비 | `/expenses` | 경비 기록 관리 (미구현) |
| 프로필 | `/profile` | 비밀번호 변경 |
| 관리자 | `/admin/*` | 대시보드, 직원관리, 미수금 |

## 인증 시스템

- **JWT 세션**: Access Token 12시간 (Auth.js 기본 JWT 전략)
- **세션 검증**: 미들웨어(auth 콜백) → layout.tsx(user.id 체크) 2단계

### 세션 처리 흐름 (2단계)

1. **미들웨어 (auth.config.ts)**: `auth?.user` 존재 여부 (비로그인 차단)
2. **layout.tsx**: `user.id` 체크 (무효 세션 차단)

### 향후 구현 예정 (미구현)
- 로그인 상태 유지 (Remember Me): Refresh Token + iron-session 이중 쿠키 시스템
- Sliding Session: Access Token 자동 갱신
- Token Rotation: Refresh Token 사용 시마다 새 토큰 발급

## 규칙

- 한글 주석 사용
- shadcn/ui (new-york 스타일)
- zod 유효성 검사
- 작업할 때는 반드시 브랜치를 만들고 작업할 것
- 스키마 변경 시 `prisma db push` 대신 `prisma migrate dev` 사용 (마이그레이션 히스토리 유지)
