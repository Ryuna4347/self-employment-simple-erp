"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, RefreshCw, Search, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUser } from "@/components/providers/app-providers";
import { canWrite } from "@/lib/role-utils";
import { useUsers } from "@/hooks/use-users";
import {
  useOutstanding,
  type OutstandingParams,
} from "../hooks/use-outstanding";
import { OutstandingCard } from "./outstanding-card";
import type { OutstandingRecord } from "./outstanding-card";
import { StoreOutstandingCard } from "./store-outstanding-card";
import type { StoreGroup } from "./store-outstanding-card";
import { CollectionRequestModal } from "@/app/(with-nav)/work-records/components/collection-request-modal";

type ViewMode = "date" | "store";

// 연도 옵션 생성 (2024 ~ 현재 연도)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y);
  }
  return years;
}

// 월 옵션 (1~12)
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

/**
 * 미수금 관리 메인 컨텐츠 (조회 전용)
 *
 * 날짜별/매장별 필터를 전환하며 미수금 목록을 표시한다.
 */
export function OutstandingContent() {
  const { role } = useUser();
  const writable = canWrite(role);
  const searchParams = useSearchParams();
  const router = useRouter();
  const now = new Date();

  // URL에서 초기값 읽기
  const initialYear = searchParams.get("year")
    ? Number(searchParams.get("year"))
    : now.getFullYear();
  const initialMonth = searchParams.get("month")
    ? Number(searchParams.get("month"))
    : now.getMonth() + 1;
  const initialView = (searchParams.get("view") as ViewMode) || "date";
  const initialStoreName = searchParams.get("storeName") ?? "";
  const initialUserId = searchParams.get("userId") ?? "all";

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [view, setView] = useState<ViewMode>(initialView);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [searchStoreName, setSearchStoreName] = useState(initialStoreName);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);

  // 직원 목록 조회
  const { data: users } = useUsers();

  // URL 동기화
  useEffect(() => {
    const params = new URLSearchParams();
    params.set("view", view);
    if (view === "date") {
      params.set("year", String(year));
      params.set("month", String(month));
    }
    if (searchStoreName) params.set("storeName", searchStoreName);
    if (selectedUserId !== "all") params.set("userId", selectedUserId);
    router.replace(`/admin/outstanding?${params.toString()}`);
  }, [year, month, view, searchStoreName, selectedUserId, router]);

  // 쿼리 파라미터 구성
  const queryParams: OutstandingParams = useMemo(() => {
    const userId = selectedUserId !== "all" ? selectedUserId : undefined;
    if (view === "date") {
      return {
        filter: "date",
        year,
        month,
        userId,
        ...(searchStoreName ? { search: searchStoreName } : {}),
      };
    }
    return {
      filter: "store",
      ...(searchStoreName ? { storeName: searchStoreName } : {}),
      userId,
    };
  }, [view, year, month, searchStoreName, selectedUserId]);

  // 데이터 조회
  const {
    data,
    isLoading,
    isError,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useOutstanding(queryParams);

  // 페이지 플래튼
  const allRecords = useMemo(
    () => data?.pages.flatMap((page) => page.records) ?? [],
    [data]
  );

  // 서버 요약
  const summary = useMemo(() => {
    const s = data?.pages[0]?.summary;
    if (!s) return { totalOutstanding: 0, count: 0 };
    return s;
  }, [data]);

  // 매장별 그룹핑 (store 모드에서만 사용)
  const storeGroups = useMemo((): StoreGroup[] => {
    if (view !== "store" || !allRecords.length) return [];

    const groupMap = new Map<string, StoreGroup>();

    for (const record of allRecords) {
      const key = record.storeNameSnapshot ?? "-";

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          storeName: key,
          storeId: record.storeId,
          storeAddress: record.storeAddressSnapshot,
          paymentType: record.paymentTypeSnapshot,
          managerName: record.managerNameSnapshot,
          records: [],
          totalAmount: 0,
        });
      }

      const group = groupMap.get(key)!;
      group.records.push({
        id: record.id,
        date: record.date,
        totalAmount: record.totalAmount,
        collectionStatus: record.collectionStatus,
        collectedAt: record.collectedAt,
        collectedByName: record.collectedByName,
      });
    }

    // 미수금 합계 계산
    for (const group of groupMap.values()) {
      group.totalAmount = group.records
        .filter((r) => r.collectionStatus === "UNCOLLECTED")
        .reduce((sum, r) => sum + r.totalAmount, 0);
    }

    // 미수금 합계 내림차순 정렬
    return Array.from(groupMap.values()).sort(
      (a, b) => b.totalAmount - a.totalAmount,
    );
  }, [view, allRecords]);

  // 무한 스크롤 트리거
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // 일괄 수금 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStoreId, setModalStoreId] = useState<string | null>(null);
  const [modalStoreName, setModalStoreName] = useState("");

  // 매장별 뷰에서 수금처리 클릭
  const handleStoreCollect = useCallback(
    (group: StoreGroup) => {
      if (!group.storeId) return;
      setModalStoreId(group.storeId);
      setModalStoreName(group.storeName);
      setModalOpen(true);
    },
    []
  );

  // 날짜별 뷰에서 수금처리 클릭
  const handleRecordCollect = useCallback(
    (record: OutstandingRecord) => {
      if (!record.storeId) return;
      setModalStoreId(record.storeId);
      setModalStoreName(record.storeNameSnapshot ?? "-");
      setModalOpen(true);
    },
    []
  );

  // 매장명 검색 실행
  const handleStoreSearch = useCallback(() => {
    setSearchStoreName(storeName.trim());
  }, [storeName]);

  const yearOptions = getYearOptions();

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24">
      {/* 직원 필터 */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 mb-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Users className="size-4 text-gray-500" />
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="담당자 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 필터 컨트롤 */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {view === "date" && (
          <>
            {/* 연도 선택 */}
            <Select
              value={String(year)}
              onValueChange={(v) => setYear(Number(v))}
            >
              <SelectTrigger className="w-[100px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}년
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* 월 선택 */}
            <Select
              value={String(month)}
              onValueChange={(v) => setMonth(Number(v))}
            >
              <SelectTrigger className="w-[90px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m}월
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {/* 뷰 토글 */}
        <div className="flex gap-1 ml-auto shrink-0">
          <Button
            variant={view === "date" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("date")}
          >
            날짜별
          </Button>
          <Button
            variant={view === "store" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("store")}
          >
            매장별
          </Button>
        </div>
      </div>
      {/* 요약 카드 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">미수금 합계</span>
          <span className="text-lg font-bold text-red-600">
            {summary.totalOutstanding.toLocaleString()}원
          </span>
        </div>
        <div className="text-xs text-gray-500 text-right mt-1">
          {summary.count}건
        </div>
      </div>

      {/* 매장명 검색 */}
      <div className="flex gap-1.5 mb-6">
        <Input
          className="h-8 text-sm"
          placeholder="매장명/입금자 검색"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleStoreSearch();
          }}
        />
        <Button variant="outline" size="sm" onClick={handleStoreSearch}>
          <Search className="size-4" />
        </Button>
      </div>
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 에러 상태 */}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive text-sm">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        </div>
      )}

      {/* 미수금 목록 */}
      {data && (
        <div className="space-y-3">
          {view === "date" ? (
            // 날짜별 보기: 플랫 리스트
            allRecords.length > 0 ? (
              allRecords.map((record) => (
                <OutstandingCard
                  key={record.id}
                  record={record}
                  onCollect={writable ? handleRecordCollect : undefined}
                />
              ))
            ) : (
              <div className="text-center py-16 text-sm text-gray-400">
                {searchStoreName ? "검색 결과가 없습니다" : "미수금이 없습니다"}
              </div>
            )
          ) : // 매장별 보기: 매장 그룹 카드
          storeGroups.length > 0 ? (
            storeGroups.map((group) => (
              <StoreOutstandingCard
                key={group.storeName}
                group={group}
                onCollect={writable ? handleStoreCollect : undefined}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              {searchStoreName ? "검색 결과가 없습니다" : "미수금이 없습니다"}
            </div>
          )}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
      )}

      {/* 일괄 수금 처리 모달 */}
      {writable && (
        <CollectionRequestModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          storeId={modalStoreId}
          storeName={modalStoreName}
          userRole="ADMIN"
        />
      )}

      {/* 새로고침 버튼 */}
      <button
        onClick={() => refetch()}
        disabled={isFetching}
        className="fixed bottom-[5.75rem] right-7 size-12 rounded-full shadow-md transition-all z-40 flex items-center justify-center bg-white text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        aria-label="새로고침"
      >
        <RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
