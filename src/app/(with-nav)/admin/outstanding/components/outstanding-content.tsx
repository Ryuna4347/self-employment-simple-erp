"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useInfiniteScroll } from "@/hooks/use-infinite-scroll";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Search, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RefreshFab } from "@/components/common/refresh-fab";
import { useUser } from "@/components/providers/app-providers";
import { canWrite } from "@/lib/role-utils";
import { useUsers } from "@/hooks/use-users";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAgedOutstandingCount,
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
  const initialAgedOnly = searchParams.get("agedOnly") === "true";

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [view, setView] = useState<ViewMode>(initialView);
  const [storeName, setStoreName] = useState(initialStoreName);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [agedOnly, setAgedOnly] = useState<boolean>(initialAgedOnly);

  // 매장명 입력을 디바운스하여 실시간 검색 (입력이 멈추면 1초 후 적용)
  const searchStoreName = useDebounce(storeName, 1000).trim();

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
    if (view === "store" && agedOnly) {
      params.set("agedOnly", "true");
    }
    if (searchStoreName) params.set("storeName", searchStoreName);
    if (selectedUserId !== "all") params.set("userId", selectedUserId);
    router.replace(`/admin/outstanding?${params.toString()}`);
  }, [year, month, view, searchStoreName, selectedUserId, agedOnly, router]);

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
      ...(agedOnly ? { agedOnly: true } : {}),
    };
  }, [view, year, month, searchStoreName, selectedUserId, agedOnly]);

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
  const { data: agedCount = 0 } = useAgedOutstandingCount();

  // 페이지 플래튼
  const allRecords = useMemo(
    () => data?.pages.flatMap((page) => page.records) ?? [],
    [data],
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
      if (!record.storeId) continue;

      const key = record.storeId;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          storeName: record.storeNameSnapshot ?? "-",
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
  const loadMoreRef = useInfiniteScroll({ hasNextPage, isFetchingNextPage, fetchNextPage });

  // 일괄 수금 모달 상태
  const [modalOpen, setModalOpen] = useState(false);
  const [modalStoreId, setModalStoreId] = useState<string | null>(null);
  const [modalStoreName, setModalStoreName] = useState("");

  // 매장별 뷰에서 수금처리 클릭
  const handleStoreCollect = useCallback((group: StoreGroup) => {
    if (!group.storeId) return;
    setModalStoreId(group.storeId);
    setModalStoreName(group.storeName);
    setModalOpen(true);
  }, []);

  // 날짜별 뷰에서 수금처리 클릭
  const handleRecordCollect = useCallback((record: OutstandingRecord) => {
    if (!record.storeId) return;
    setModalStoreId(record.storeId);
    setModalStoreName(record.storeNameSnapshot ?? "-");
    setModalOpen(true);
  }, []);

  const showAgedAlert = agedCount > 0 && !(view === "store" && agedOnly);

  const handleViewAged = useCallback(() => {
    setView("store");
    setAgedOnly(true);
  }, []);

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

      {showAgedAlert && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 text-sm text-amber-900 min-w-0">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="truncate">
              2달 이상 장기 미수가 있는 매장이 <strong>{agedCount}곳</strong>{" "}
              있습니다
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewAged}
            className="shrink-0 bg-white"
          >
            확인하기
          </Button>
        </div>
      )}

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

      {/* 매장명 검색 (실시간) */}
      <div className="relative mb-6">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
        <Input
          className="h-8 text-sm pl-8"
          placeholder="매장명/입금자 검색"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
        />
      </div>
      {view === "store" && (
        <label className="flex items-center gap-2 mb-4 text-sm text-gray-700 cursor-pointer select-none">
          <Checkbox
            id="aged-only"
            checked={agedOnly}
            onCheckedChange={(checked) => setAgedOnly(checked === true)}
          />
          <span>2달 이상 장기 미수만 보기</span>
        </label>
      )}
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
                key={group.storeId}
                group={group}
                onCollect={writable ? handleStoreCollect : undefined}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              {searchStoreName
                ? "검색 결과가 없습니다"
                : agedOnly
                  ? "2달 이상 장기 미수가 없습니다"
                  : "미수금이 없습니다"}
            </div>
          )}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={loadMoreRef} className="h-1" />
      {isFetchingNextPage && (
        <div className="text-center py-4 text-gray-500 text-sm">
          불러오는 중...
        </div>
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
      <RefreshFab onRefresh={() => refetch()} isFetching={isFetching} />
    </div>
  );
}
