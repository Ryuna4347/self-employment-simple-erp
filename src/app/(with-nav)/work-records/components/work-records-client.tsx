"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { Search, Fuel, Wrench } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MountOnFirstOpen } from "@/components/common/mount-on-first-open"
import { CalendarHeader } from "./calendar-header"
import { DailyStats } from "./daily-stats"
import { WorkRecordList } from "./work-record-list"
import { FabMenu } from "./fab-menu"
import { UserFilter } from "./user-filter"
import { DeleteModeActionBar } from "./delete-mode-action-bar"
import { NoticeBanner } from "./notice-banner"
import { useDailyCost } from "../hooks/use-daily-cost"
import {
  useWorkRecords,
  useDeleteWorkRecord,
  useUpdateWorkRecord,
  useReorderWorkRecords,
  type WorkRecordResponse,
} from "../hooks/use-work-records"
import { storesQueryOptions } from "@/app/(with-nav)/stores/hooks/use-stores"
import { storeTemplatesQueryOptions } from "@/app/(with-nav)/store-templates/hooks/use-store-templates"
import { usersQueryOptions } from "@/hooks/use-users"
import type { Role } from "@/generated/prisma/client"
import { canWrite } from "@/lib/role-utils"
import { preloadOnIdle } from "@/lib/preload-on-idle"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

// 모달은 열 때만 필요하므로 초기 번들에서 분리한다 (react-hook-form·zod·Drawer 등 포함).
// MountOnFirstOpen으로 처음 열 때 마운트하고, 목록을 그린 뒤 유휴 시간에 청크를 미리 받아 둔다.
// 로더는 next/dynamic과 미리 받기(preloadOnIdle)에서 함께 써야 같은 청크를 재사용한다
const loadWorkRecordModal = () => import("./work-record-modal")
const loadTemplateApplyModal = () => import("./template-apply-modal")
const loadBulkDeleteModal = () => import("./bulk-delete-modal")
const loadDeleteSelectedModal = () => import("./delete-selected-modal")
const loadDailyCostModal = () => import("./daily-cost-modal")
const loadCollectionRequestModal = () => import("./collection-request-modal")
const loadDailyCashCollectionModal = () => import("./daily-cash-collection-modal")

const WorkRecordModal = dynamic(
  () => loadWorkRecordModal().then((m) => m.WorkRecordModal),
  { ssr: false }
)
const TemplateApplyModal = dynamic(
  () => loadTemplateApplyModal().then((m) => m.TemplateApplyModal),
  { ssr: false }
)
const BulkDeleteModal = dynamic(
  () => loadBulkDeleteModal().then((m) => m.BulkDeleteModal),
  { ssr: false }
)
const DeleteSelectedModal = dynamic(
  () => loadDeleteSelectedModal().then((m) => m.DeleteSelectedModal),
  { ssr: false }
)
const DailyCostModal = dynamic(
  () => loadDailyCostModal().then((m) => m.DailyCostModal),
  { ssr: false }
)
const CollectionRequestModal = dynamic(
  () => loadCollectionRequestModal().then((m) => m.CollectionRequestModal),
  { ssr: false }
)
const DailyCashCollectionModal = dynamic(
  () => loadDailyCashCollectionModal().then((m) => m.DailyCashCollectionModal),
  { ssr: false }
)

interface WorkRecordsClientProps {
  userId: string
  userRole: Role
}

export function WorkRecordsClient({ userId, userRole }: WorkRecordsClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [storeName, setStoreName] = useState("")
  // 매장명 입력을 디바운스하여 실시간 검색 (입력이 멈추면 0.5초 후 적용)
  const searchStoreName = useDebounce(storeName, 500).trim()

  // 모달 상태
  const [workRecordModalOpen, setWorkRecordModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [collectionRequestModalOpen, setCollectionRequestModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WorkRecordResponse | null>(null)
  const [collectionRequestTarget, setCollectionRequestTarget] = useState<WorkRecordResponse | null>(null)
  const [fuelCostModalOpen, setFuelCostModalOpen] = useState(false)
  const [repairCostModalOpen, setRepairCostModalOpen] = useState(false)
  const [dailyCashModalOpen, setDailyCashModalOpen] = useState(false)

  // 삭제 모드 (체크박스 선택 삭제 / 전체 삭제)
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteSelectedModalOpen, setDeleteSelectedModalOpen] = useState(false)

  const isAdmin = userRole === "ADMIN"
  const writable = canWrite(userRole)
  const dateString = format(selectedDate, "yyyy-MM-dd")

  // 비용: "전체"가 아닌 경우에만 조회
  const isAllUsers = isAdmin && selectedUserId === "all"
  const costUserId = isAdmin ? selectedUserId : undefined
  const { data: fuelCost } = useDailyCost("주유비", dateString, isAllUsers ? undefined : costUserId)
  const { data: repairCost } = useDailyCost("차량수리비", dateString, isAllUsers ? undefined : costUserId)
  const canEditCost = writable && (!isAdmin || selectedUserId === userId)

  const listUserId = isAdmin ? selectedUserId : undefined
  const { data, isLoading, isPlaceholderData, error, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkRecords(
    dateString,
    listUserId,
    searchStoreName || undefined
  )

  const records = useMemo(() => data?.pages.flatMap((page) => page.records) ?? [], [data])
  const summary = data?.pages[0]?.summary
  const totalCount = data?.pages[0]?.pagination.totalCount ?? 0

  // 무한 스크롤 트리거
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = loadMoreRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        // 검색 결과를 기다리며 이전 목록(placeholder)을 보여 주는 동안에는 다음 페이지를 요청하지 않는다
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage && !isPlaceholderData) {
          fetchNextPage()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, fetchNextPage])

  const deleteMutation = useDeleteWorkRecord()
  const updateMutation = useUpdateWorkRecord()
  const reorderMutation = useReorderWorkRecords()

  // 목록을 그린 뒤 유휴 시간에 모달 청크를 미리 받아 첫 오픈 지연을 없앤다
  const shouldPreloadModals = writable && !isLoading
  useEffect(() => {
    if (!shouldPreloadModals) return
    return preloadOnIdle([
      loadWorkRecordModal,
      loadTemplateApplyModal,
      loadDailyCostModal,
      loadCollectionRequestModal,
      loadBulkDeleteModal,
      loadDeleteSelectedModal,
      ...(isAdmin ? [loadDailyCashCollectionModal] : []),
    ])
  }, [shouldPreloadModals, isAdmin])

  // FAB 메뉴를 열면(근무기록 추가/코스 적용 의도) 모달에서 쓸 목록을 미리 받아 둔다.
  // 모달의 조회는 열릴 때만 실행되므로, 여기서 먼저 받아 두면 모달을 열자마자 목록이 보인다.
  const queryClient = useQueryClient()
  const handleFabMenuOpen = useCallback(() => {
    void queryClient.prefetchQuery(storesQueryOptions())
    void queryClient.prefetchQuery(storeTemplatesQueryOptions(userId))
    void queryClient.prefetchQuery(usersQueryOptions())
  }, [queryClient, userId])

  // 본인 기록을 볼 때만 드래그앤드롭 순서 변경 가능 (검색 중, 삭제 모드에는 비활성화)
  // 새 목록을 불러오는 동안 이전 목록(placeholder)을 보여 줄 때도 비활성화한다.
  // 검색어를 지운 직후 이전 검색 결과만 보이는 상태에서 정렬하면 일부 기록의 순서만 저장되기 때문
  const canReorder =
    (!isAdmin || selectedUserId === userId) && !searchStoreName && !deleteMode && !isPlaceholderData

  // 삭제 모드에서 선택 가능한(삭제 권한 있는) 기록 ID
  // 일반 사용자는 미수금(UNCOLLECTED) 기록만 삭제할 수 있다 (서버 권한 모델과 동일)
  // PENDING 수금 확인 요청에 묶인 기록도 일반 사용자는 삭제 불가
  const selectableIds = useMemo(
    () =>
      new Set(
        records
          .filter(
            (r) =>
              isAdmin ||
              (r.collectionStatus === "UNCOLLECTED" && !r.pendingRequestId)
          )
          .map((r) => r.id)
      ),
    [records, isAdmin]
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // 선택은 지금 목록에서 선택 가능한 기록으로만 한정한다.
  // 목록이 바뀌어(새로 불러온 결과 등) 화면에서 사라진 기록이 선택에 남아 함께 삭제되지 않도록
  const visibleSelectedIds = useMemo(
    () => new Set([...selectedIds].filter((id) => selectableIds.has(id))),
    [selectedIds, selectableIds]
  )

  const allSelected = selectableIds.size > 0 && visibleSelectedIds.size === selectableIds.size

  const toggleAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds))
  }, [allSelected, selectableIds])

  const exitDeleteMode = useCallback(() => {
    setDeleteMode(false)
    setSelectedIds(new Set())
  }, [])

  // 날짜/유저 필터/검색어가 바뀌면 선택 대상이 달라지므로 삭제 모드 종료 (stale 선택 방지)
  // effect 대신 렌더 중 상태 조정 패턴 사용
  const filterKey = `${dateString}|${selectedUserId}|${searchStoreName}`
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey)
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey)
    if (deleteMode) {
      setDeleteMode(false)
      setSelectedIds(new Set())
    }
  }

  const handleReorder = useCallback((reorderedRecords: { id: string; sortOrder: number }[]) => {
    reorderMutation.mutate({ date: dateString, userId: listUserId, records: reorderedRecords })
  }, [dateString, listUserId, reorderMutation])

  // 삭제/수금처리 진행 중인 레코드 ID
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null
  const collectingId = (updateMutation.isPending && updateMutation.variables?.collectionStatus === "COLLECTED")
    ? updateMutation.variables.id
    : null

  // DailyStats용 summary (서버에서 계산된 전체 날짜 기준)
  const dailySummary = useMemo(() => {
    if (!summary) return { totalVisits: 0, totalSales: 0, collectedSales: 0, uncollectedSales: 0, collectedByPaymentType: { CASH: 0, ACCOUNT: 0, CARD: 0 }, pendingCollectionSales: 0, pendingCollectionByPaymentType: { CASH: 0, ACCOUNT: 0, CARD: 0 } }
    return summary
  }, [summary])

  // 근무기록 추가 모달 열기
  const handleAddRecord = () => {
    setEditingRecord(null)
    setWorkRecordModalOpen(true)
  }

  // 코스 적용 모달 열기
  const handleApplyTemplate = () => {
    setTemplateModalOpen(true)
  }

  // 근무기록 수정 모달 열기
  const handleEditRecord = (record: WorkRecordResponse) => {
    setEditingRecord(record)
    setWorkRecordModalOpen(true)
  }

  // 근무기록 삭제 (확인 창은 work-record-card에서 처리)
  const handleDeleteRecord = (id: string) => {
    deleteMutation.mutate(id)
  }

  // 수금처리
  const handleCollectRecord = (id: string) => {
    updateMutation.mutate({ id, collectionStatus: "COLLECTED" })
  }

  // 수금 확인 요청 모달 열기
  const handleRequestCollect = (record: WorkRecordResponse) => {
    setCollectionRequestTarget(record)
    setCollectionRequestModalOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className={cn("max-w-4xl mx-auto px-4 py-6", deleteMode ? "pb-28" : "pb-8")}>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">근무 기록</h1>
            {!isAllUsers && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-sm"
                  onClick={canEditCost ? () => setRepairCostModalOpen(true) : undefined}
                  disabled={!canEditCost && repairCost?.amount == null}
                >
                  <Wrench className="size-4" />
                  {repairCost?.amount != null
                    ? `${repairCost.amount.toLocaleString()}원`
                    : "차량수리비"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1.5 text-sm"
                  onClick={canEditCost ? () => setFuelCostModalOpen(true) : undefined}
                  disabled={!canEditCost && fuelCost?.amount == null}
                >
                  <Fuel className="size-4" />
                  {fuelCost?.amount != null
                    ? `${fuelCost.amount.toLocaleString()}원`
                    : "주유비"}
                </Button>
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm mt-1">일별 방문 기록과 거래 내역을 관리합니다</p>
        </div>

        <NoticeBanner />

        <CalendarHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {isAdmin && (
          <UserFilter
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            currentUserId={userId}
          />
        )}

        <DailyStats summary={dailySummary} />

        {isAdmin && (
          <div className="flex justify-end -mt-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDailyCashModalOpen(true)}
            >
              전날 직원별 현금 수금
            </Button>
          </div>
        )}

        {/* 매장명 검색 (실시간) */}
        <div className="relative mb-4">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none" />
          <Input
            className="h-8 text-sm pl-8"
            placeholder="매장명 검색"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">데이터를 불러오는데 실패했습니다</div>
        ) : (
          // 검색어 변경으로 새 결과를 불러오는 동안에는 이전 목록을 흐리게 유지한다
          <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isPlaceholderData}>
            <WorkRecordList records={records} onEdit={writable ? handleEditRecord : undefined} onDelete={writable ? handleDeleteRecord : undefined} onCollect={writable ? handleCollectRecord : undefined} onRequestCollect={writable ? handleRequestCollect : undefined} userRole={userRole} deletingId={deletingId} collectingId={collectingId} canReorder={canReorder} onReorder={handleReorder} deleteMode={deleteMode} selectedIds={visibleSelectedIds} selectableIds={selectableIds} onToggleSelect={toggleSelect} />
          </div>
        )}

        {/* 무한 스크롤 트리거 */}
        <div ref={loadMoreRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
        )}

        {writable && !deleteMode && (
          <FabMenu
            onAddRecord={handleAddRecord}
            onApplyTemplate={handleApplyTemplate}
            onBulkDelete={() => setDeleteMode(true)}
            onRefresh={() => refetch()}
            onMenuOpen={handleFabMenuOpen}
            isRefreshing={isFetching}
            // 새 목록을 불러오는 동안(이전 목록 표시 중)에는 삭제 모드 진입 버튼을 숨긴다.
            // 전체 삭제는 새 필터 기준으로 실행되는데 건수는 이전 목록 기준으로 보이는 문제 방지
            // (변경 전에도 불러오는 동안에는 목록이 비어 있어 이 버튼이 보이지 않았다)
            hasRecords={records.length > 0 && !isPlaceholderData}
          />
        )}

        {/* 삭제 모드 하단 액션 바 */}
        {writable && deleteMode && (
          <DeleteModeActionBar
            selectedCount={visibleSelectedIds.size}
            selectableCount={selectableIds.size}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onDeleteSelected={() => setDeleteSelectedModalOpen(true)}
            onDeleteAll={() => setBulkDeleteModalOpen(true)}
            onCancel={exitDeleteMode}
          />
        )}
      </div>

      {/* 모달: 처음 열 때 마운트 (그 전에는 코드·조회 모두 지연) */}
      {writable && (
        <>
          {/* 근무기록 추가/수정 모달 */}
          <MountOnFirstOpen open={workRecordModalOpen}>
            <WorkRecordModal
              open={workRecordModalOpen}
              onOpenChange={setWorkRecordModalOpen}
              selectedDate={selectedDate}
              editRecord={editingRecord}
              userRole={userRole}
            />
          </MountOnFirstOpen>

          {/* 코스 적용 모달 */}
          <MountOnFirstOpen open={templateModalOpen}>
            <TemplateApplyModal
              open={templateModalOpen}
              onOpenChange={setTemplateModalOpen}
              selectedDate={selectedDate}
              userId={userId}
            />
          </MountOnFirstOpen>

          {/* 근무기록 전체 삭제 모달 */}
          <MountOnFirstOpen open={bulkDeleteModalOpen}>
            <BulkDeleteModal
              open={bulkDeleteModalOpen}
              onOpenChange={setBulkDeleteModalOpen}
              selectedDate={selectedDate}
              userId={listUserId}
              search={searchStoreName || undefined}
              estimatedCount={totalCount}
              onDeleted={exitDeleteMode}
            />
          </MountOnFirstOpen>

          {/* 근무기록 선택 삭제 확인 모달 */}
          <MountOnFirstOpen open={deleteSelectedModalOpen}>
            <DeleteSelectedModal
              open={deleteSelectedModalOpen}
              onOpenChange={setDeleteSelectedModalOpen}
              selectedIds={[...visibleSelectedIds]}
              onDeleted={exitDeleteMode}
            />
          </MountOnFirstOpen>

          {/* 주유비 입력 모달 */}
          <MountOnFirstOpen open={fuelCostModalOpen}>
            <DailyCostModal
              open={fuelCostModalOpen}
              onOpenChange={setFuelCostModalOpen}
              date={dateString}
              title="주유비"
              currentAmount={fuelCost?.amount ?? null}
            />
          </MountOnFirstOpen>

          {/* 차량수리비 입력 모달 */}
          <MountOnFirstOpen open={repairCostModalOpen}>
            <DailyCostModal
              open={repairCostModalOpen}
              onOpenChange={setRepairCostModalOpen}
              date={dateString}
              title="차량수리비"
              currentAmount={repairCost?.amount ?? null}
            />
          </MountOnFirstOpen>

          {/* 수금 확인 요청 / 일괄 수금 처리 모달 */}
          <MountOnFirstOpen open={collectionRequestModalOpen}>
            <CollectionRequestModal
              open={collectionRequestModalOpen}
              onOpenChange={setCollectionRequestModalOpen}
              storeId={collectionRequestTarget?.storeId ?? null}
              storeName={collectionRequestTarget?.storeNameSnapshot ?? collectionRequestTarget?.store?.name ?? "알 수 없음"}
              userRole={userRole}
            />
          </MountOnFirstOpen>
        </>
      )}

      {isAdmin && (
        <MountOnFirstOpen open={dailyCashModalOpen}>
          <DailyCashCollectionModal
            open={dailyCashModalOpen}
            onOpenChange={setDailyCashModalOpen}
            baseDate={selectedDate}
          />
        </MountOnFirstOpen>
      )}
    </div>
  )
}
