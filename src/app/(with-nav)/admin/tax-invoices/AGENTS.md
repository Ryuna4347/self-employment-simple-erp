# Tax Parties Admin Page

## 개요

세금계산서 발급에 사용할 TaxParty 사업자 마스터 정보를 관리하는 관리자 화면입니다.
TaxParty는 사업자명, 사업자등록번호, 대표자명, 업태, 종목, 세금계산서 이메일, 주소를 관리합니다.

## 접근 권한

- `ADMIN`, `VIEWER`가 접근할 수 있습니다.
- `VIEWER`는 읽기 전용이며 추가/편집/삭제 버튼과 저장 모달을 렌더링하지 않습니다.
- 쓰기 액션은 `canWrite(role)`로 렌더링 자체를 차단합니다.

## 사용 API

- `GET /api/admin/tax-parties` - 사업자 마스터 목록 조회
- `POST /api/admin/tax-parties` - 사업자 마스터 생성
- `PUT /api/admin/tax-parties/[id]` - 사업자 마스터 수정
- `DELETE /api/admin/tax-parties/[id]` - 사업자 마스터 삭제

## 외부 세금계산서 발급 API (X-API-Key)

내부 화면이 호출하는 API는 아니지만 동일 도메인의 데이터를 사용한다.

- `GET /api/tax-invoices/pending?year=YYYY&month=MM` - 미발행 집계 (TaxParty가 연결되고 `taxInvoiceEnabled=true`이며 결제방식이 `CASH`/`ACCOUNT`인 매장 대상)
- `PUT /api/tax-invoices/result` - 외부 발급기가 처리 결과(`SUBMITTED`/`SKIPPED`/`FAILED`)를 보고. `idempotencyKey = ${storeId}-${year}-${month}`로 upsert

발행 결과는 `TaxInvoiceResult` 모델에 저장되며 `splitVat`/`formatDecimalString`(`src/lib/tax-invoice-utils.ts`)이 부가세 분리/포맷에 사용된다.

## 주요 컴포넌트

- `components/tax-parties-content.tsx` - 검색, 목록, 생성/수정/삭제 모달 상태 관리
- `components/tax-party-card.tsx` - 사업자 정보 카드
- `components/tax-party-modal.tsx` - `ResponsiveModal` 기반 생성/수정 통합 모달
- `components/delete-tax-party-modal.tsx` - 삭제 확인 모달
- `hooks/use-tax-parties.ts` - TanStack Query API 훅

## UI 규칙

- API 호출은 `apiClient`만 사용합니다.
- 모달은 `ResponsiveModal`만 사용합니다.
- `VIEWER`에게 disabled 버튼을 보여주지 않고 쓰기 UI를 렌더링하지 않습니다.
- 옵션 표시 형식은 매장 autocomplete와 동일하게 `사업자명(사업자번호)` 기준을 따릅니다.
