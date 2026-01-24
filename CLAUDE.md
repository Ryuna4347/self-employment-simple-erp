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
  - 체크 시: 7일간 자동 로그인 (Refresh Token)
  - 미체크 시: 18시간 후 만료 + 브라우저 닫으면 로그아웃
- **Sliding Session**: Access Token 1시간 (30분 미만 남았을 때 자동 갱신)
- **Token Rotation**: Refresh Token 사용 시마다 새 토큰 발급

## 규칙

- 한글 주석 사용
- shadcn/ui (new-york 스타일)
- zod 유효성 검사
