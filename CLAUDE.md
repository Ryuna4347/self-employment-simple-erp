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
├── auth.ts              # NextAuth.js 메인 설정 (Credentials, JWT, Prisma adapter)
├── auth.config.ts       # NextAuth.js Edge 설정 (authorized 콜백, 리다이렉트)
├── middleware.ts         # Edge 미들웨어 (인증 라우트 보호)
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
│   ├── api-client.ts        # API fetch 래퍼 (인증 헤더)
│   ├── api-response.ts      # API 응답 헬퍼 (success/error)
│   ├── auth-guard.ts        # 인증 검증 유틸
│   ├── collection-utils.ts  # 수금 관련 계산
│   ├── date-utils.ts        # 날짜 포매팅
│   ├── excel/               # 엑셀 내보내기
│   │   ├── monthly-report.ts
│   │   ├── utils.ts
│   │   └── types.ts
│   ├── get-session.ts       # 서버사이드 세션 조회
│   ├── get-token.ts         # JWT 토큰 조회
│   ├── invite.ts            # 초대 코드 유틸
│   ├── korean-to-english.ts # 한글 입력 처리
│   ├── prisma.ts            # Prisma 클라이언트 싱글톤
│   ├── query-client.ts      # React Query 클라이언트 설정
│   ├── role-utils.ts        # 역할 권한 체크 유틸 (VIEWER 등)
│   ├── supabase.ts          # Supabase 클라이언트 설정
│   ├── utils.ts             # 범용 유틸리티
│   └── validations.ts       # Zod 검증 스키마
└── types/
    └── next-auth.d.ts       # NextAuth 타입 확장
```

## API 라우트

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts          # NextAuth 핸들러
│   └── session/route.ts                # GET 세션 조회
├── register/
│   ├── verify/route.ts                 # POST 초대 코드 검증
│   └── complete/route.ts               # POST 회원가입 완료
├── users/route.ts                      # GET 사용자 목록
├── profile/password/route.ts           # PATCH 비밀번호 변경
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
│   ├── bulk/route.ts                  # POST 일괄 삭제
│   └── reorder/route.ts              # PATCH 근무기록 순서 변경
├── collection-requests/
│   ├── route.ts                        # GET/POST 수금 요청 목록/생성
│   └── [id]/
│       ├── route.ts                    # GET/PUT/DELETE 수금 요청 CRUD
│       ├── approve/route.ts           # POST 승인
│       └── reject/route.ts            # POST 거부
├── expenses/
│   └── daily-cost/route.ts            # POST 일일 비용 기록
├── notices/
│   └── latest/route.ts                # GET 최신 공지 조회
├── cron/
│   └── generate-recurring-costs/route.ts  # POST 고정비용 자동 생성
├── upload/route.ts                     # POST 파일 업로드 (Supabase)
└── admin/
    ├── dashboard/route.ts              # GET 대시보드 데이터
    ├── staff/
    │   ├── route.ts                    # GET/POST 직원 목록/초대
    │   └── [id]/route.ts              # DELETE 직원 삭제 (soft delete)
    ├── create-invite/route.ts          # POST 초대 코드 생성
    ├── outstanding/
    │   ├── route.ts                    # GET 미수금 목록
    │   └── batch-collect/route.ts     # PATCH 일괄 수금
    ├── collection-history/route.ts     # GET 수금 이력
    ├── costs/
    │   ├── route.ts                    # GET/POST 비용 목록/생성
    │   └── [id]/route.ts              # PUT/DELETE 비용 수정/삭제
    ├── recurring-costs/
    │   ├── route.ts                    # GET/POST 고정비용 목록/생성
    │   └── [id]/route.ts              # PUT/DELETE 고정비용 수정/삭제
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
| 근무기록 | `/work-records` | 방문 기록, 거래 내역, 수금 요청, 일일 비용 |
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
- **Expense**: 비용 (date, userId, title, amount, description, isAutoGenerated)
- **StoreTemplate**: 순회 코스 (name, description, userId)
- **StoreTemplateMember**: 코스 매장 (templateId, storeId, order)
- **CollectionRequest**: 수금 확인 요청 (storeId, requesterId, status, reviewerId)
- **CollectionRequestItem**: 요청 대상 레코드 (collectionRequestId, workRecordId)
- **RecurringCost**: 고정비용 (name, amount, frequency, isActive, userId)
- **Notice**: 공지사항 (title, content, expiresAt, authorId)
- **RefreshToken**: 리프레시 토큰 (userId, tokenHash, expiresAt, rememberMe)

### Enum
- **Role**: ADMIN, USER, VIEWER
- **PaymentType**: CASH, ACCOUNT, CARD
- **ReceiptType**: NONE, SIMPLE_RECEIPT, TRANSACTION_STATEMENT
- **CollectionStatus**: UNCOLLECTED, COLLECTED, CLOSED
- **RecurringCostFrequency**: WEEKLY, MONTHLY
- **CollectionRequestStatus**: PENDING, APPROVED, REJECTED

## 인증 시스템

- **JWT 세션**: Access Token 12시간 (Auth.js 기본 JWT 전략)
- **세션 검증**: 미들웨어(auth 콜백) → layout.tsx(user.id 체크) 2단계

### 세션 처리 흐름 (2단계)

1. **미들웨어 (auth.config.ts)**: `auth?.user` 존재 여부 (비로그인 차단)
2. **layout.tsx**: `user.id` 체크 (무효 세션 차단)

### 역할 (Role)
- **ADMIN**: 모든 기능 접근 (읽기/쓰기)
- **USER**: 근무기록, 매장, 템플릿 관리
- **VIEWER**: 읽기 전용 계정, 관리자 대시보드만 접근 가능

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

## 하네스: ERP 풀스택 개발 팀

**목표:** 이 ERP 프로젝트의 모든 코드 변경을 도메인 특화 에이전트 팀이 표준 워크플로우로 처리하도록 한다.

**최우선 트리거 규칙 (필수):**

이 프로젝트의 코드 변경 작업은 **반드시 `erp-feature-builder` 스킬을 먼저 사용한다.** 글로벌 에이전트(api-architect, openapi-docs-expert, ui-design-expert, ui-engineer)보다 항상 우선한다. 이유:

- 이 ERP의 도메인 규칙(스냅샷 필드, KST 타임존, VIEWER 권한, 마이그레이션 정책)을 글로벌 에이전트는 모른다
- 이 프로젝트의 회귀 패턴(API↔프론트 shape 불일치, VIEWER UI 누락)이 빈번하여 incremental QA가 필수
- 한국어 도메인 문서(CLAUDE.md/CLAUDE.local.md 21개)를 분석하는 에이전트가 별도로 정의됨

**트리거 키워드 (이 중 하나라도 해당하면 erp-feature-builder 사용):**
- 도메인: 근무기록, 매장, 거래처, 순회, 템플릿, 미수금, 수금, 비용, 고정비용, 공지, 직원, 관리자, 대시보드, 경비, 프로필, 회원가입, 로그인
- 기술: API 라우트, Prisma, 마이그레이션, 스키마, 페이지, 컴포넌트, 모달, shadcn, TanStack Query, react-hook-form, zod
- 권한: ADMIN, USER, VIEWER, 역할, 권한 가드
- 작업 유형: 추가, 수정, 삭제, 변경, 개선, 버그, 회귀, 리팩터링, 업데이트, 보완, 재실행

**트리거하지 않는 경우:**
- 단순 질문 ("이 함수가 뭐 해?"), 코드 읽기만 요청, 일반 프로그래밍 질문
- 사용자가 명시적으로 글로벌 에이전트 호출 요청 (예: "ui-engineer로 해줘")

**구성:**
- 에이전트 5명: `erp-domain-analyst`, `erp-schema-architect`, `erp-backend-engineer`, `erp-frontend-engineer`, `erp-qa-validator`
- 오케스트레이터 스킬: `erp-feature-builder`
- 전용 스킬 5개: `erp-domain-context`, `erp-schema-rules`, `erp-api-patterns`, `erp-ui-patterns`, `erp-qa-checks`

**변경 이력:**
| 날짜 | 변경 내용 | 대상 | 사유 |
|------|----------|------|------|
| 2026-04-25 | 초기 구성 — ERP 풀스택 개발 팀 + 오케스트레이터 + 5개 전용 스킬 | 전체 | 도메인 회귀 패턴(권한/타임존/스냅샷/shape 불일치) 사전 차단 |
