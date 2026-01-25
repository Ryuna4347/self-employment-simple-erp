// 근무 기록 타입 정의

import { PaymentType } from "@/generated/prisma/client";

export interface RecordItem {
  id: string;
  workRecordId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  managerName?: string;
  paymentType: PaymentType;
}

export interface WorkRecord {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  store: Store;
  storeId: string;
  userId: string;
  isCollected: boolean;
  note?: string;
  paymentTypeSnapshot: PaymentType;
  items: RecordItem[];
}

// 일별 요약 통계
export interface DailySummary {
  totalVisits: number;
  totalSales: number;
  collectedSales: number;
  uncollectedSales: number;
}

// 근무 기록 폼 데이터
export interface WorkRecordFormData {
  date: Date;
  storeId: string;
  isCollected: boolean;
  note?: string;
  items: {
    name: string;
    unitPrice: number;
    quantity: number;
  }[];
}

// 더미 데이터 (API 연동 전까지 사용)
export const MOCK_STORES: Store[] = [
  {
    id: "store-1",
    name: "강남점",
    address: "서울시 강남구 강남대로 123",
    managerName: "김철수",
    paymentType: "CASH",
  },
  {
    id: "store-2",
    name: "홍대점",
    address: "서울시 마포구 홍익로 45",
    managerName: "이영희",
    paymentType: "ACCOUNT",
  },
  {
    id: "store-3",
    name: "신촌점",
    address: "서울시 서대문구 신촌역로 67",
    managerName: "박민수",
    paymentType: "CARD",
  },
  {
    id: "store-4",
    name: "종로점",
    address: "서울시 종로구 종로 89",
    managerName: "최지현",
    paymentType: "CASH",
  },
];

export const MOCK_WORK_RECORDS: WorkRecord[] = [
  {
    id: "wr-1",
    date: new Date().toISOString().split("T")[0],
    storeId: "store-1",
    userId: "user-1",
    isCollected: true,
    paymentTypeSnapshot: "CASH",
    note: "재방문 예정",
    store: MOCK_STORES[0],
    items: [
      {
        id: "ri-1",
        workRecordId: "wr-1",
        name: "콜라 500ml",
        unitPrice: 1500,
        quantity: 20,
      },
      {
        id: "ri-2",
        workRecordId: "wr-1",
        name: "사이다 1.5L",
        unitPrice: 2000,
        quantity: 10,
      },
    ],
  },
  {
    id: "wr-2",
    date: new Date().toISOString().split("T")[0],
    storeId: "store-2",
    userId: "user-1",
    isCollected: false,
    paymentTypeSnapshot: "ACCOUNT",
    store: MOCK_STORES[1],
    items: [
      {
        id: "ri-3",
        workRecordId: "wr-2",
        name: "생수 2L",
        unitPrice: 1000,
        quantity: 30,
      },
      {
        id: "ri-4",
        workRecordId: "wr-2",
        name: "커피믹스 100입",
        unitPrice: 8500,
        quantity: 5,
      },
    ],
  },
  {
    id: "wr-3",
    date: new Date().toISOString().split("T")[0],
    storeId: "store-3",
    userId: "user-1",
    isCollected: false,
    paymentTypeSnapshot: "CARD",
    note: "다음 주 재입고 필요",
    store: MOCK_STORES[2],
    items: [
      {
        id: "ri-5",
        workRecordId: "wr-3",
        name: "과자 세트",
        unitPrice: 5000,
        quantity: 15,
      },
    ],
  },
];

// 유틸리티 함수: 총 금액 계산
export function calculateTotalAmount(items: RecordItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

// 유틸리티 함수: 결제 방식 한글 변환
export function formatPaymentType(type: PaymentType): string {
  const typeMap: Record<PaymentType, string> = {
    CASH: "현금",
    ACCOUNT: "계좌이체",
    CARD: "카드",
  };
  return typeMap[type];
}
