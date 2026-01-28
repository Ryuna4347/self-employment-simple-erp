# WorkRecord 도메인 (근무기록)

## 개요

일별 방문 기록과 거래 내역을 관리하는 핵심 도메인입니다.

### 핵심 기능
- 근무/방문 기록 CRUD
- 거래 품목 스냅샷 저장 (RecordItem)
- 수금 상태 관리
- 매장 템플릿 자동 로드

---

## 데이터 모델

### WorkRecord (방문 기록)
- `date`: 방문 날짜
- `storeId`: 방문 매장
- `userId`: 작성자
- `isCollected`: 수금 완료 여부
- `note`: 영업 메모
- `paymentTypeSnapshot`: 거래 당시 결제 방식

### RecordItem (거래 상세 - 스냅샷)
- `name`: 품목명
- `unitPrice`: 단가
- `quantity`: 수량

---

## 비즈니스 규칙

### 스냅샷 원칙
- RecordItem은 저장 시점의 데이터를 독립 보관
- 원본 변경/삭제되어도 기록 유지

### 금액 계산
- totalAmount는 DB 저장 안 함
- `SUM(unitPrice * quantity)`로 실시간 계산

### 수금 관리
- `isCollected: false` → 미수금
- 완납 시 true로 업데이트

---

## 관련 페이지

- `/work-records` - 근무기록 메인 (캘린더 + 리스트)
- 근무 추가/수정 모달
