"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { format } from "date-fns"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CalendarHeader } from "./calendar-header"
import { DailyStats } from "./daily-stats"
import { WorkRecordList } from "./work-record-list"
import { FabMenu } from "./fab-menu"
import { UserFilter } from "./user-filter"
import { WorkRecordModal } from "./work-record-modal"
import { TemplateApplyModal } from "./template-apply-modal"
import {
  useWorkRecords,
  useDeleteWorkRecord,
  useUpdateWorkRecord,
  type WorkRecordResponse,
} from "../hooks/use-work-records"

interface WorkRecordsClientProps {
  userId: string
  userRole: "ADMIN" | "USER"
}

export function WorkRecordsClient({ userId, userRole }: WorkRecordsClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)
  const [storeName, setStoreName] = useState("")
  const [searchStoreName, setSearchStoreName] = useState("")
  const [page, setPage] = useState(1)

  // 모달 상태
  const [workRecordModalOpen, setWorkRecordModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WorkRecordResponse | null>(null)

  const isAdmin = userRole === "ADMIN"
  const dateString = format(selectedDate, "yyyy-MM-dd")

  const { data, isLoading, error, refetch, isFetching } = useWorkRecords(
    dateString,
    isAdmin ? selectedUserId : undefined,
    page,
    searchStoreName || undefined
  )

  const records = data?.records ?? []
  const summary = data?.summary
  const pagination = data?.pagination

  // 필터 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1)
  }, [selectedDate, selectedUserId, searchStoreName])

  const deleteMutation = useDeleteWorkRecord()
  const updateMutation = useUpdateWorkRecord()

  // 삭제/수금처리 진행 중인 레코드 ID
  const deletingId = deleteMutation.isPending ? deleteMutation.variables : null
  const collectingId = (updateMutation.isPending && updateMutation.variables?.collectionStatus === "COLLECTED")
    ? updateMutation.variables.id
    : null

  // DailyStats용 summary (서버에서 계산된 전체 날짜 기준)
  const dailySummary = useMemo(() => {
    if (!summary) return { totalVisits: 0, totalSales: 0, collectedSales: 0, uncollectedSales: 0, collectedByPaymentType: { CASH: 0, ACCOUNT: 0, CARD: 0 } }
    return summary
  }, [summary])

  // 매장명 검색 실행
  const handleSearch = useCallback(() => {
    setSearchStoreName(storeName.trim())
  }, [storeName])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30">
      <div className="max-w-4xl mx-auto px-4 py-6 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">근무 기록</h1>
          <p className="text-gray-600 text-sm mt-1">일별 방문 기록과 거래 내역을 관리합니다</p>
        </div>

        <CalendarHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />

        {isAdmin && (
          <UserFilter
            selectedUserId={selectedUserId}
            onUserChange={setSelectedUserId}
            currentUserId={userId}
          />
        )}

        <DailyStats summary={dailySummary} />

        {/* 매장명 검색 */}
        <div className="flex gap-1.5 mb-4">
          <Input
            className="h-8 text-sm"
            placeholder="매장명 검색"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch()
            }}
          />
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="size-4" />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">데이터를 불러오는데 실패했습니다</div>
        ) : (
          <WorkRecordList records={records} onEdit={handleEditRecord} onDelete={handleDeleteRecord} onCollect={handleCollectRecord} userRole={userRole} deletingId={deletingId} collectingId={collectingId} />
        )}

        {/* 페이지네이션 */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage((p) => p - 1)}
            >
              이전
            </Button>
            <span className="text-sm text-gray-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}

        <FabMenu onAddRecord={handleAddRecord} onApplyTemplate={handleApplyTemplate} onRefresh={() => refetch()} isRefreshing={isFetching} />
      </div>

      {/* 근무기록 추가/수정 모달 */}
      <WorkRecordModal
        open={workRecordModalOpen}
        onOpenChange={setWorkRecordModalOpen}
        selectedDate={selectedDate}
        editRecord={editingRecord}
      />

      {/* 코스 적용 모달 */}
      <TemplateApplyModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        selectedDate={selectedDate}
      />
    </div>
  )
}
