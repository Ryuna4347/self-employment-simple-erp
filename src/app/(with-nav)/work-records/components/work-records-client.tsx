"use client"

import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { format } from "date-fns"
import { Search, Fuel, Wrench } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CalendarHeader } from "./calendar-header"
import { DailyStats } from "./daily-stats"
import { WorkRecordList } from "./work-record-list"
import { FabMenu } from "./fab-menu"
import { UserFilter } from "./user-filter"
import { WorkRecordModal } from "./work-record-modal"
import { TemplateApplyModal } from "./template-apply-modal"
import { BulkDeleteModal } from "./bulk-delete-modal"
import { CollectionRequestModal } from "./collection-request-modal"
import { DailyCashCollectionModal } from "./daily-cash-collection-modal"
import { DailyCostModal } from "./daily-cost-modal"
import { NoticeBanner } from "./notice-banner"
import { useDailyCost } from "../hooks/use-daily-cost"
import {
  useWorkRecords,
  useDeleteWorkRecord,
  useUpdateWorkRecord,
  useReorderWorkRecords,
  type WorkRecordResponse,
} from "../hooks/use-work-records"
import type { Role } from "@/generated/prisma/client"
import { canWrite } from "@/lib/role-utils"
import { useDebounce } from "@/hooks/use-debounce"

interface WorkRecordsClientProps {
  userId: string
  userRole: Role
}

export function WorkRecordsClient({ userId, userRole }: WorkRecordsClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [storeName, setStoreName] = useState("")
  // 매장명 입력을 디바운스하여 실시간 검색 (입력이 멈추면 1초 후 적용)
  const searchStoreName = useDebounce(storeName, 1000).trim()

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

  const isAdmin = userRole === "ADMIN"
  const writable = canWrite(userRole)
  const dateString = format(selectedDate, "yyyy-MM-dd")

  // 비용: "전체"가 아닌 경우에만 조회
  const isAllUsers = isAdmin && selectedUserId === "all"
  const costUserId = isAdmin ? selectedUserId : undefined
  const { data: fuelCost } = useDailyCost("주유비", dateString, isAllUsers ? undefined : costUserId)
  const { data: repairCost } = useDailyCost("차량수리비", dateString, isAllUsers ? undefined : costUserId)
  const canEditCost = writable && (!isAdmin || selectedUserId === userId)

  const { data, isLoading, error, refetch, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useWorkRecords(
    dateString,
    isAdmin ? selectedUserId : undefined,
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
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const deleteMutation = useDeleteWorkRecord()
  const updateMutation = useUpdateWorkRecord()
  const reorderMutation = useReorderWorkRecords()

  // 본인 기록을 볼 때만 드래그앤드롭 순서 변경 가능 (검색 중에는 비활성화)
  const canReorder = (!isAdmin || selectedUserId === userId) && !searchStoreName

  const handleReorder = useCallback((reorderedRecords: { id: string; sortOrder: number }[]) => {
    reorderMutation.mutate({ date: dateString, records: reorderedRecords })
  }, [dateString, reorderMutation])

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
      <div className="max-w-4xl mx-auto px-4 py-6 pb-8">
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
          <WorkRecordList records={records} onEdit={writable ? handleEditRecord : undefined} onDelete={writable ? handleDeleteRecord : undefined} onCollect={writable ? handleCollectRecord : undefined} onRequestCollect={writable ? handleRequestCollect : undefined} userRole={userRole} deletingId={deletingId} collectingId={collectingId} canReorder={canReorder} onReorder={handleReorder} />
        )}

        {/* 무한 스크롤 트리거 */}
        <div ref={loadMoreRef} className="h-1" />
        {isFetchingNextPage && (
          <div className="text-center py-4 text-gray-500 text-sm">불러오는 중...</div>
        )}

        {writable && (
          <FabMenu
            onAddRecord={handleAddRecord}
            onApplyTemplate={handleApplyTemplate}
            onBulkDelete={() => setBulkDeleteModalOpen(true)}
            onRefresh={() => refetch()}
            isRefreshing={isFetching}
            hasRecords={records.length > 0}
          />
        )}
      </div>

      {writable && (
        <>
          {/* 근무기록 추가/수정 모달 */}
          <WorkRecordModal
            open={workRecordModalOpen}
            onOpenChange={setWorkRecordModalOpen}
            selectedDate={selectedDate}
            editRecord={editingRecord}
            userRole={userRole}
          />

          {/* 코스 적용 모달 */}
          <TemplateApplyModal
            open={templateModalOpen}
            onOpenChange={setTemplateModalOpen}
            selectedDate={selectedDate}
            userId={userId}
          />

          {/* 근무기록 전체 삭제 모달 */}
          <BulkDeleteModal
            open={bulkDeleteModalOpen}
            onOpenChange={setBulkDeleteModalOpen}
            selectedDate={selectedDate}
            userId={isAdmin ? selectedUserId : undefined}
            search={searchStoreName || undefined}
            estimatedCount={totalCount}
          />

          {/* 주유비 입력 모달 */}
          <DailyCostModal
            open={fuelCostModalOpen}
            onOpenChange={setFuelCostModalOpen}
            date={dateString}
            title="주유비"
            currentAmount={fuelCost?.amount ?? null}
          />

          {/* 차량수리비 입력 모달 */}
          <DailyCostModal
            open={repairCostModalOpen}
            onOpenChange={setRepairCostModalOpen}
            date={dateString}
            title="차량수리비"
            currentAmount={repairCost?.amount ?? null}
          />

          {/* 수금 확인 요청 / 일괄 수금 처리 모달 */}
          <CollectionRequestModal
            open={collectionRequestModalOpen}
            onOpenChange={setCollectionRequestModalOpen}
            storeId={collectionRequestTarget?.storeId ?? null}
            storeName={collectionRequestTarget?.storeNameSnapshot ?? collectionRequestTarget?.store?.name ?? "알 수 없음"}
            userRole={userRole}
          />
        </>
      )}

      {isAdmin && (
        <DailyCashCollectionModal
          open={dailyCashModalOpen}
          onOpenChange={setDailyCashModalOpen}
          baseDate={selectedDate}
        />
      )}
    </div>
  )
}
