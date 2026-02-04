"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
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
  type WorkRecordResponse,
} from "../hooks/use-work-records"
import type { DailySummary } from "../types"

interface WorkRecordsClientProps {
  userId: string
  userRole: "ADMIN" | "USER"
}

export function WorkRecordsClient({ userId, userRole }: WorkRecordsClientProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)

  // 모달 상태
  const [workRecordModalOpen, setWorkRecordModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WorkRecordResponse | null>(null)

  const isAdmin = userRole === "ADMIN"
  const dateString = format(selectedDate, "yyyy-MM-dd")

  const { data: workRecords = [], isLoading, error } = useWorkRecords(
    dateString,
    isAdmin ? selectedUserId : undefined
  )

  const deleteMutation = useDeleteWorkRecord()

  const dailySummary = useMemo((): DailySummary => {
    const totalVisits = workRecords.length
    let totalSales = 0
    let collectedSales = 0
    let uncollectedSales = 0

    workRecords.forEach((record) => {
      const amount = record.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      totalSales += amount
      if (record.isCollected) {
        collectedSales += amount
      } else {
        uncollectedSales += amount
      }
    })

    return { totalVisits, totalSales, collectedSales, uncollectedSales }
  }, [workRecords])

  // 근무기록 추가 모달 열기
  const handleAddRecord = () => {
    setEditingRecord(null)
    setWorkRecordModalOpen(true)
  }

  // 템플릿 적용 모달 열기
  const handleApplyTemplate = () => {
    setTemplateModalOpen(true)
  }

  // 근무기록 수정 모달 열기
  const handleEditRecord = (record: WorkRecordResponse) => {
    setEditingRecord(record)
    setWorkRecordModalOpen(true)
  }

  // 근무기록 삭제
  const handleDeleteRecord = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      deleteMutation.mutate(id)
    }
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

        {isLoading ? (
          <div className="text-center py-8 text-gray-500">로딩 중...</div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">데이터를 불러오는데 실패했습니다</div>
        ) : (
          <WorkRecordList records={workRecords} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />
        )}

        <FabMenu onAddRecord={handleAddRecord} onApplyTemplate={handleApplyTemplate} />
      </div>

      {/* 근무기록 추가/수정 모달 */}
      <WorkRecordModal
        open={workRecordModalOpen}
        onOpenChange={setWorkRecordModalOpen}
        selectedDate={selectedDate}
        editRecord={editingRecord}
      />

      {/* 템플릿 적용 모달 */}
      <TemplateApplyModal
        open={templateModalOpen}
        onOpenChange={setTemplateModalOpen}
        selectedDate={selectedDate}
      />
    </div>
  )
}
