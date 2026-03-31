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
- **Auth**: 커스텀 JWT (jose) + RefreshToken
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

## 라우트 구조

```
src/app/
├── (auth)/              # 인증 관련 CLAUDE.md만 존재 (페이지 없음)
├── (with-nav)/          # 네비게이션 포함 (Header + BottomNav)
│   ├── layout.tsx       # 세션 검증 + AppProviders
│   ├── work-records/    # 근무기록 (캘린더 + 리스트)
│   ├── stores/          # 매장 관리
│   ├── store-templates/ # 순회 코스 템플릿
│   ├── expenses/        # 경비 (미구현, CLAUDE.md만 존재)
│   ├── profile/         # 프로필 (비밀번호 변경)
│   └── admin/           # 관리자 전용
│       ├── page.tsx     # 관리자 랜딩 페이지
│       ├── dashboard/   # 대시보드
│       ├── staff/       # 직원 관리
│       ├── outstanding/ # 미수금 관리
│       ├── collections/ # 수금 관리
│       ├── costs/       # 비용 관리
│       └── notices/     # 공지 관리
├── register/            # 회원가입
├── api/                 # API 라우트
├── layout.tsx           # 루트 레이아웃 (fonts, providers)
└── page.tsx             # 로그인 페이지 (/)
```

## 소스 구조

```
src/
├── middleware.ts         # Edge 미들웨어 (JWT 서명 검증, 라우트 보호)
├── components/
│   ├── ui/              # shadcn/ui 컴포넌트 (14개)
│   ├── common/          # 공통 레이아웃 컴포넌트
│   │   ├── header.tsx
│   │   ├── bottom-nav.tsx
│   │   ├── error-view.tsx
│   │   ├── loading-view.tsx
│   │   ├── searchable-dropdown.tsx
│   │   └── user-filter.tsx
│   └── providers/
│       └── app-providers.tsx  # QueryClient, 테마, 401 전역 처리
├── hooks/               # 전역 커스텀 훅
│   ├── use-dropdown-state.ts
│   ├── use-is-mobile.ts
│   ├── use-session-sync.ts
│   └── use-users.ts
├── lib/                 # 유틸리티 & 라이브러리
│   ├── api-client.ts        # API fetch 래퍼 (토큰 갱신 + 403 자동 재시도)
│   ├── api-response.ts      # API 응답 헬퍼 (success/error)
│   ├── auth-guard.ts        # API 라우트 인증 검증 (JWT 검증)
│   ├── jwt.ts               # JWT 서명/검증 (jose, Edge 호환)
│   ├── token-service.ts     # RefreshToken DB 관리
│   ├── token-expiry.ts      # 클라이언트 토큰 만료시간 관리
│   ├── collection-utils.ts  # 수금 관련 계산
│   ├── date-utils.ts        # 날짜 포매팅
│   ├── excel/               # 엑셀 내보내기
│   │   ├── monthly-report.ts
│   │   ├── utils.ts
│   │   └── types.ts
│   ├── get-session.ts       # 서버 컴포넌트 세션 조회 (JWT 검증)
│   ├── get-token.ts         # JWT 토큰 직접 조회
│   ├── invite.ts            # 초대 코드 유틸
│   ├── korean-to-english.ts # 한글 입력 처리
│   ├── prisma.ts            # Prisma 클라이언트 싱글톤
│   ├── query-client.ts      # React Query 클라이언트 설정
│   ├── supabase.ts          # Supabase 클라이언트 설정
│   ├── utils.ts             # 범용 유틸리티
│   └── validations.ts       # Zod 검증 스키마
└── types/
    └── auth.ts              # 인증 관련 타입 (AuthUser, AuthSession 등)
```

## API 라우트

```
src/app/api/
├── auth/
│   ├── login/route.ts                  # POST 로그인 (토큰 발급)
│   ├── refresh/route.ts                # POST 토큰 갱신
│   ├── logout/route.ts                 # POST 로그아웃 (토큰 삭제)
│   └── session/route.ts                # GET 세션 조회
├── register/
│   ├── verify/route.ts                 # POST 초대 코드 검증
│   └── complete/route.ts               # POST 회원가입 완료
├── users/route.ts                      # GET 사용자 목록
├── profile/password/route.ts           # POST 비밀번호 변경
├── stores/
│   ├── route.ts                        # GET/POST 매장 목록/생성
│   └── [id]/route.ts                   # GET/PUT/DELETE 매장 CRUD
├── store-templates/
│   ├── route.ts                        # GET/POST 템플릿 목록/생성
│   └── [id]/
│       ├── route.ts                    # GET/PUT/DELETE 템플릿 CRUD
│       └── apply/route.ts             # POST 템플릿 적용 (일괄 생성)
├── work-records/
│   ├── route.ts                        # GET/POST 근무기록 목록/생성
│   ├── [id]/
│   │   ├── route.ts                    # GET/PUT/DELETE 근무기록 CRUD
│   │   └── save-store/route.ts        # POST 매장 저장
│   ├── store-visits/route.ts          # GET 매장 방문 이력
│   ├── store-uncollected/route.ts     # GET 매장별 미수금
│   ├── batch-collect/route.ts         # PATCH 일괄 수금처리
│   └── reorder/route.ts              # PATCH 근무기록 순서 변경
├── collection-requests/
│   ├── route.ts                        # GET/POST 수금 요청 목록/생성
│   └── [id]/
│       ├── route.ts                    # GET/PUT/DELETE 수금 요청 CRUD
│       ├── approve/route.ts           # POST 승인
│       └── reject/route.ts            # POST 거부
├── expenses/
│   └── fuel-cost/route.ts             # POST 유류비 기록
├── notices/
│   └── latest/route.ts                # GET 최신 공지 조회
├── upload/route.ts                     # POST 파일 업로드 (Supabase)
└── admin/
    ├── dashboard/route.ts              # GET 대시보드 데이터
    ├── staff/
    │   ├── route.ts                    # GET/POST 직원 목록/초대
    │   └── [id]/route.ts              # PUT/DELETE 직원 수정/삭제
    ├── create-invite/route.ts          # POST 초대 코드 생성
    ├── outstanding/
    │   ├── route.ts                    # GET 미수금 목록
    │   └── batch-collect/route.ts     # PATCH 일괄 수금
    ├── collection-history/route.ts     # GET 수금 이력
    ├── costs/
    │   ├── route.ts                    # GET/POST 비용 목록/생성
    │   └── [id]/route.ts              # PUT/DELETE 비용 수정/삭제
    ├── notices/
    │   ├── route.ts                    # GET/POST 공지 목록/생성
    │   └── [id]/route.ts              # PUT/DELETE 공지 수정/삭제
    └── export/monthly/route.ts         # POST 월간 엑셀 내보내기
```

## 주요 도메인

| 도메인 | 경로 | 설명 |
|--------|------|------|
| 인증 | `/`, `/register` | 로그인, 회원가입 |
| 매장 | `/stores` | 매장 정보 관리 |
| 근무기록 | `/work-records` | 방문 기록, 거래 내역, 수금 요청, 유류비 |
| 순회 템플릿 | `/store-templates` | 매장 그룹/코스 관리 |
| 경비 | `/expenses` | 경비 기록 관리 (미구현) |
| 프로필 | `/profile` | 비밀번호 변경 |
| 관리자 | `/admin/*` | 대시보드, 직원관리, 미수금, 수금, 비용, 공지, 엑셀 내보내기 |

## 데이터 모델 (Prisma)

### 핵심 모델
- **User**: 사용자 (loginId, name, password, role, inviteCode, isDeleted)
- **Store**: 매장 (name, address, managerName, PaymentType, coordinates, receiptType, assignedUserId)
- **StoreItem**: 매장 기본 품목 (storeId, name, amount, quantity)
- **WorkRecord**: 방문 기록 (date, storeId, userId, collectionStatus, imageUrl, snapshots, sortOrder)
- **RecordItem**: 거래 상세 (workRecordId, name, amount, quantity)
- **Expense**: 비용 (date, userId, title, amount, description)
- **StoreTemplate**: 순회 코스 (name, description, userId)
- **StoreTemplateMember**: 코스 매장 (templateId, storeId, order)
- **CollectionRequest**: 수금 확인 요청 (storeId, requesterId, status, reviewerId)
- **CollectionRequestItem**: 요청 대상 레코드 (collectionRequestId, workRecordId)
- **Notice**: 공지사항 (title, content, expiresAt, authorId)
- **RefreshToken**: 리프레시 토큰 (userId, tokenHash, rememberMe, expiresAt)

### Enum
- **Role**: ADMIN, USER
- **PaymentType**: CASH, ACCOUNT, CARD
- **ReceiptType**: NONE, SIMPLE_RECEIPT, TRANSACTION_STATEMENT
- **CollectionStatus**: UNCOLLECTED, COLLECTED, CLOSED
- **CollectionRequestStatus**: PENDING, APPROVED, REJECTED

## 인증 시스템

- **JWT**: jose 라이브러리 (HS256, Edge Runtime 호환)
- **Access Token**: 30분 만료, httpOnly 쿠키 (`access-token`)
- **Refresh Token**: 7일 만료, httpOnly 쿠키 (`refresh-token`, Path=/api/auth), DB에 해시 저장
- **Auth**: 커스텀 JWT 시스템 (Auth.js 미사용)

### 토큰 갱신 흐름

1. **사전 갱신**: 프론트가 메모리에 만료시간 저장, 요청 전 10분 이내면 `/api/auth/refresh` 호출
2. **403 폴백**: API에서 토큰 만료 시 403 반환 → 프론트가 자동 갱신 후 재시도
3. **자동로그인 (rememberMe)**: refreshToken 만료 3일 이내 시 accessToken 갱신과 함께 refreshToken도 회전

### 세션 처리 흐름

1. **미들웨어 (middleware.ts)**: accessToken 서명만 검증 (만료 무시), 무효 시 로그인 리다이렉트
2. **API 라우트 (auth-guard.ts)**: accessToken 서명 + 만료 검증, 만료 시 403 반환
3. **서버 컴포넌트 (get-session.ts)**: accessToken 검증하여 세션 반환

### 인증 API

- `POST /api/auth/login` - 로그인 (accessToken + refreshToken 발급)
- `POST /api/auth/refresh` - 토큰 갱신
- `POST /api/auth/logout` - 로그아웃 (토큰 삭제)
- `GET /api/auth/session` - 세션 정보 조회

## 규칙

- 한글 주석 사용
- shadcn/ui (new-york 스타일)
- zod 유효성 검사
- 작업할 때는 반드시 브랜치를 만들고 작업할 것
- 스키마 변경 시 `prisma db push` 대신 `prisma migrate dev` 사용 (마이그레이션 히스토리 유지)
