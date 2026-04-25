"use client"

import { useState } from "react"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCosts, type CostRecord } from "../hooks/use-costs"
import { CostCard } from "./cost-card"
import { CostModal } from "./cost-modal"
import { DeleteCostModal } from "./delete-cost-modal"
import { RecurringCostModal } from "./recurring-cost-modal"
import { useUser } from "@/components/providers/app-providers"
import { canWrite } from "@/lib/role-utils"

// 연도 옵션 생성 (2024 ~ 현재 연도)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let y = 2024; y <= currentYear; y++) {
    years.push(y)
  }
  return years
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)

export function CostsContent() {
  const { role } = useUser()
  const writable = canWrite(role)
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 모달 상태
  const [costModalOpen, setCostModalOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<CostRecord | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingCost, setDeletingCost] = useState<CostRecord | null>(null)
  const [recurringModalOpen, setRecurringModalOpen] = useState(false)

  const { data, isLoading, isError, isFetching, refetch } = useCosts(year, month)
  const yearOptions = getYearOptions()

  const handleEdit = (cost: CostRecord) => {
    setEditingCost(cost)
    setCostModalOpen(true)
  }

  const handleDelete = (cost: CostRecord) => {
    setDeletingCost(cost)
    setDeleteModalOpen(true)
  }

  const handleModalClose = (open: boolean) => {
    if (!open) {
      setEditingCost(null)
    }
    setCostModalOpen(open)
  }

  const handleDeleteModalClose = (open: boolean) => {
    if (!open) {
      setDeletingCost(null)
    }
    setDeleteModalOpen(open)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* 상단: 연/월 선택 + 추가 버튼 */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
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

        <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
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

        {writable && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="ml-auto"
              onClick={() => setRecurringModalOpen(true)}
            >
              고정비용
            </Button>
            <Button
              size="sm"
              onClick={() => setCostModalOpen(true)}
            >
              <Plus className="size-4" />
              추가
            </Button>
          </>
        )}
      </div>

      {/* 요약 카드 */}
      {data && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {year}년 {month}월 총 비용
              </p>
              <p className="text-xl font-bold text-orange-600">
                {data.summary.totalCosts.toLocaleString()}원
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {data.summary.count}건
            </div>
          </div>
        </div>
      )}

      {/* 로딩 */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* 에러 */}
      {isError && (
        <div className="flex items-center justify-center py-20">
          <p className="text-destructive text-sm">
            데이터를 불러오는 중 오류가 발생했습니다.
          </p>
        </div>
      )}

      {/* 비용 목록 */}
      {data && (
        <div className="space-y-3">
          {data.records.length > 0 ? (
            data.records.map((cost) => (
              <CostCard
                key={cost.id}
                cost={cost}
                onEdit={writable ? handleEdit : undefined}
                onDelete={writable ? handleDelete : undefined}
              />
            ))
          ) : (
            <div className="text-center py-16 text-sm text-gray-400">
              등록된 비용이 없습니다
            </div>
          )}
        </div>
      )}

      {/* 생성/수정 모달 */}
      {writable && (
        <CostModal
          open={costModalOpen}
          onOpenChange={handleModalClose}
          editingCost={editingCost}
        />
      )}

      {/* 삭제 확인 모달 */}
      {writable && deletingCost && (
        <DeleteCostModal
          open={deleteModalOpen}
          onOpenChange={handleDeleteModalClose}
          cost={deletingCost}
        />
      )}

      {/* 고정비용 관리 모달 */}
      {writable && (
        <RecurringCostModal
          open={recurringModalOpen}
          onOpenChange={setRecurringModalOpen}
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
  )
}
