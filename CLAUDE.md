# Small-Shop ERP

자영업 간단 ERP 시스템 - Next.js 16 App Router 기반

## 개발 명령어

```bash
pnpm dev              # 개발 서버
pnpm build            # 프로덕션 빌드
pnpm lint             # 린트
npx tsc --noEmit      # 타입 체크
pnpm prisma studio    # DB GUI
pnpm prisma migrate dev  # 마이그레이션 생성/적용
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
- **Icons**: Lucide React
- **Date**: date-fns
- **Theme**: next-themes

## 인증 시스템

- **JWT 세션**: Access Token 12시간 (Auth.js 기본 JWT 전략)
- **세션 검증 2단계**: 미들웨어(`auth.config.ts`) → `layout.tsx`(`user.id` 체크)
- **Refresh Token**: 구현 후 revert됨 (`f88a006`). `RefreshToken` 모델은 schema에 잔존

## 주의사항 (Gotchas)

- **Zod 4**: `zod@^4.3.5` 사용. Zod 3과 API 차이 있음 (예: `z.coerce` → `z.coerce.number()`)
- **Prisma Client 경로**: `src/generated/prisma`에 생성됨 (`prisma/schema.prisma`의 output 설정)
- **next-auth 5 beta**: `next-auth@5.0.0-beta.30` 사용. 안정 릴리스 아님
- **스키마 변경**: `prisma db push` 대신 `prisma migrate dev` 사용 (마이그레이션 히스토리 유지)

## 규칙

- 한글 주석 사용
- shadcn/ui (new-york 스타일)
- zod 유효성 검사
- 작업할 때는 반드시 브랜치를 만들고 작업할 것
- 스키마 변경 시 `prisma db push` 대신 `prisma migrate dev` 사용 (마이그레이션 히스토리 유지)
