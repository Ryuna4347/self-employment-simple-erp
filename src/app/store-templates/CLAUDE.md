# StoreTemplate 도메인 (순회 코스 템플릿)

## 개요

자주 방문하는 매장 그룹을 관리하여 근무기록 생성을 간소화하는 도메인입니다.

### 핵심 기능
- 매장 그룹 템플릿 CRUD
- 방문 순서 관리
- 근무기록 일괄 생성

---

## 데이터 모델

### StoreTemplate
- `name`: 템플릿 이름 (예: "월요일 서초 코스")
- `description`: 템플릿 설명
- `userId`: 생성자

### StoreTemplateMember
- `templateId`: 소속 템플릿
- `storeId`: 참조 매장 (Live Reference)
- `order`: 방문 순서

---

## 비즈니스 규칙

### Live Reference
- 매장 정보 변경 시 템플릿에 실시간 반영

### 소유권
- 본인 템플릿만 수정/삭제 가능

### 일괄 생성
- 템플릿 적용 시 모든 매장의 WorkRecord 일괄 생성

---

## 관련 페이지

- `/store-templates` - 템플릿 목록
- 템플릿 등록/수정 모달
- 근무기록 페이지의 템플릿 선택 모달
