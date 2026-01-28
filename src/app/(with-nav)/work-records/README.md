# Work Records 페이지 구현 가이드

## 개요

일별 근무 기록(방문 기록 및 거래 내역)을 관리하는 메인 페이지입니다.

## 디자인 원칙

### 1. 목적 중심 디자인 (Purpose-Driven Design)
- **핵심 목적**: 현장 직원이 빠르고 정확하게 방문 기록을 등록/조회
- **디자인 결정**:
  - 수금 상태를 색상 바로 즉각 인지 (파란색: 수금 완료, 빨간색: 미수금)
  - 축약/상세 모드로 정보 밀도 조절
  - 큰 터치 영역으로 모바일 사용성 확보

### 2. 시각적 계층 구조 (Visual Hierarchy)
1. **최상위**: 날짜 선택 (CalendarHeader) - 사용자의 첫 액션
2. **2단계**: 일별 통계 (DailyStats) - 오늘의 성과 요약
3. **3단계**: 근무 기록 리스트 - 상세 데이터
4. **플로팅**: FAB 메뉴 - 액션 버튼

### 3. 접근성 (Accessibility)
- ✅ 키보드 네비게이션 지원 (Tab, Enter)
- ✅ ARIA 레이블 (`aria-label`, `aria-expanded`)
- ✅ 색상 + 텍스트 조합 (색맹 사용자 배려)
- ✅ 포커스 인디케이터 (`focus:ring`)
- ✅ 충분한 터치 영역 (최소 44x44px)

## 컴포넌트 구조

```
src/app/work-records/
├── page.tsx                    # 메인 페이지
├── types.ts                    # 타입 정의 + 더미 데이터
├── components/
│   ├── calendar-header.tsx     # 날짜 선택 헤더
│   ├── daily-stats.tsx         # 일별 통계 카드
│   ├── work-record-card.tsx    # 근무 기록 카드 (Accordion)
│   ├── work-record-list.tsx    # 카드 리스트 + 빈 상태
│   └── fab-menu.tsx            # Floating Action Button 메뉴
└── README.md                   # 이 문서
```

## 설치 필요 사항

### 1. 필수 패키지 설치

```bash
# date-fns (날짜 처리)
pnpm add date-fns

# date-fns 한국어 로케일 포함됨
```

### 2. shadcn/ui 컴포넌트 설치 (선택사항)

현재는 기본 컴포넌트만 사용하지만, 나중에 모달/선택 박스 등을 추가하려면:

```bash
# Card 컴포넌트 (향후 통계 카드 개선용)
pnpm dlx shadcn@latest add card

# Badge 컴포넌트 (수금 상태 뱃지)
pnpm dlx shadcn@latest add badge

# Dialog 컴포넌트 (추가/수정 모달)
pnpm dlx shadcn@latest add dialog

# Select 컴포넌트 (매장/품목 선택)
pnpm dlx shadcn@latest add select

# Textarea 컴포넌트 (메모 입력)
pnpm dlx shadcn@latest add textarea

# Separator 컴포넌트 (구분선)
pnpm dlx shadcn@latest add separator
```

## 주요 기능

### 1. CalendarHeader (날짜 선택)
- 이전/다음 날짜 네비게이션
- "오늘로 이동" 버튼
- 한국어 날짜 형식 (예: "2026년 1월 25일 토요일")

### 2. DailyStats (일별 통계)
- 총 방문 수
- 총 매출 금액
- 수금 완료/미수금 금액 분리 표시
- 그라데이션 배경으로 중요도 강조

### 3. WorkRecordCard (근무 기록 카드)

**축약 모드 (기본)**:
- 좌측 수금 상태 컬러 바 (파란색/빨간색)
- 매장명 + 주소
- 합계 금액
- 확장 아이콘

**상세 모드 (클릭 시)**:
- 결제 방식, 수금 상태, 담당자
- 품목 테이블 (품명, 단가, 수량, 소계)
- 메모
- 수정/삭제 버튼

### 4. FabMenu (플로팅 액션 버튼)
- "근무 기록 추가" 버튼
- "템플릿 적용" 버튼
- 백드롭 클릭 시 닫기
- + 아이콘 회전 애니메이션

## 더미 데이터

### MOCK_STORES
- 강남점 (현금)
- 홍대점 (계좌이체)
- 신촌점 (카드)
- 종로점 (현금)

### MOCK_WORK_RECORDS
- 오늘 날짜 기준 3개의 근무 기록
- 다양한 수금 상태 (완료/미수)
- 여러 품목 조합

## 다음 단계 구현 필요 사항

### 1. API 연동
- [ ] `GET /api/work-records?date=YYYY-MM-DD` - 일별 조회
- [ ] `POST /api/work-records` - 생성
- [ ] `PUT /api/work-records/[id]` - 수정
- [ ] `DELETE /api/work-records/[id]` - 삭제
- [ ] `PATCH /api/work-records/[id]/collect` - 수금 상태 변경

### 2. 모달 컴포넌트
- [ ] WorkRecordModal - 추가/수정 모달
  - 매장 선택 (Autocomplete)
  - 품목 입력 (동적 추가/삭제)
  - 수량/단가 입력
  - 메모 입력
- [ ] TemplateModal - 템플릿 선택 모달
  - 순회 코스 템플릿 목록
  - 선택 시 일괄 생성

### 3. 상태 관리
- [ ] TanStack Query 연동
- [ ] Optimistic Update (React 19 `useOptimistic`)
- [ ] 로딩/에러 상태 처리

### 4. 폼 검증
- [ ] react-hook-form + zod 스키마
- [ ] 품목 최소 1개 이상 필수
- [ ] 수량/단가 양수 검증

### 5. UX 개선
- [ ] 스켈레톤 로딩
- [ ] 토스트 알림 (저장 성공/실패)
- [ ] 무한 스크롤 (과거 기록 로드)
- [ ] 캘린더 Popover (전체 달력 표시)

## 반응형 디자인

### 모바일 (< 640px)
- 카드 패딩 축소
- 품목 테이블 가로 스크롤
- FAB 크기 유지 (터치 영역 확보)

### 태블릿/데스크톱 (≥ 640px)
- 최대 너비 4xl (896px)로 제한
- 여백 증가
- 호버 효과 강화

## 접근성 체크리스트

- [x] 색상 대비비 4.5:1 이상
- [x] 키보드 네비게이션 지원
- [x] 포커스 인디케이터 표시
- [x] ARIA 레이블 추가
- [x] 버튼/링크 최소 크기 44x44px
- [ ] 스크린 리더 테스트 (향후)

## 스타일 가이드

### 색상 팔레트
- **Primary**: Blue (수금 완료, 강조)
- **Danger**: Red (미수금, 삭제)
- **Neutral**: Gray (일반 텍스트, 배경)

### 타이포그래피
- **제목**: font-bold text-2xl
- **부제목**: font-semibold text-lg
- **본문**: font-medium text-base
- **캡션**: text-sm text-gray-600

### 간격
- **카드 간격**: space-y-3 (12px)
- **섹션 간격**: mb-4 (16px)
- **컨테이너 패딩**: p-4 (16px)

## 참고 자료

- [Figma 디자인](../../tasks/Dashboard.tsx)
- [Work Record 도메인](../../../docs/domains/work-record.md)
- [페이지 스펙](../../../docs/pages/work-record-page.md)
- [shadcn/ui](https://ui.shadcn.com/)
- [date-fns](https://date-fns.org/)
