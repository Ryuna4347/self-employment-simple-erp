"use client"

import { useState, useMemo } from "react"
import { format, startOfDay, differenceInCalendarDays } from "date-fns"
import { ko } from "date-fns/locale"
import { MapPin, FileText, Info } from "lucide-react"
import { toast } from "sonner"
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalFooter,
  ResponsiveModalDescription,
} from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useStoreTemplates,
  useApplyStoreTemplate,
  type StoreTemplate,
} from "@/app/(with-nav)/store-templates/hooks/use-store-templates"
import { getVisitDayAndCycle } from "@/app/(with-nav)/store-templates/utils/visit-info"

// 제외 매장 정보
interface ExcludedStore {
  id: string
  name: string
  address: string
  visitInfo: string
  reason: "duplicate" | "cycle-mismatch" | "future-first-visit"
}

// 제외 사유 라벨
const excludeReasonLabels: Record<ExcludedStore["reason"], string> = {
  duplicate: "이미 기록이 있습니다",
  "cycle-mismatch": "이 날은 방문일이 아닙니다",
  "future-first-visit": "첫 방문일 전입니다",
}

interface TemplateApplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  existingStoreIds: Set<string>
}

export function TemplateApplyModal({
  open,
  onOpenChange,
  selectedDate,
  existingStoreIds,
}: TemplateApplyModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  // 코스 목록 조회
  const { data: templates = [], isLoading: isLoadingTemplates } = useStoreTemplates()

  // 코스 적용 mutation
  const applyMutation = useApplyStoreTemplate()

  // 선택된 코스 정보
  const selectedTemplate = useMemo<StoreTemplate | undefined>(() => {
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId])

  // 제외 매장 계산 (클라이언트 사이드)
  const excludedStores = useMemo<ExcludedStore[]>(() => {
    if (!selectedTemplate) return []

    const excluded: ExcludedStore[] = []
    const targetDate = startOfDay(selectedDate)

    selectedTemplate.members.forEach((member) => {
      const { store } = member
      const visitInfo = getVisitDayAndCycle(store.firstVisitDate, store.visitCycleWeeks)

      // 1. 중복 체크 (이미 기록 존재)
      if (existingStoreIds.has(store.id)) {
        excluded.push({ id: store.id, name: store.name, address: store.address, visitInfo, reason: "duplicate" })
        return
      }

      // 2. 방문 주기 체크
      const firstVisit = startOfDay(new Date(store.firstVisitDate))
      const daysDiff = differenceInCalendarDays(targetDate, firstVisit)

      if (daysDiff < 0) {
        excluded.push({ id: store.id, name: store.name, address: store.address, visitInfo, reason: "future-first-visit" })
        return
      }

      const isVisitDay = daysDiff % (store.visitCycleWeeks * 7) === 0
      if (!isVisitDay) {
        excluded.push({ id: store.id, name: store.name, address: store.address, visitInfo, reason: "cycle-mismatch" })
      }
    })

    return excluded
  }, [selectedTemplate, selectedDate, existingStoreIds])

  // 생성될 매장 수
  const createCount = selectedTemplate
    ? selectedTemplate.memberCount - excludedStores.length
    : 0

  // 코스 적용 핸들러
  const handleApply = () => {
    if (!selectedTemplateId) return

    const dateStr = format(selectedDate, "yyyy-MM-dd")
    applyMutation.mutate(
      { id: selectedTemplateId, date: dateStr },
      {
        onSuccess: (result) => {
          onOpenChange(false)
          setSelectedTemplateId("")
          toast.success(`${result.created}개 기록이 생성되었습니다`)
        },
        onError: () => {
          toast.error("코스 적용에 실패했습니다")
        },
      }
    )
  }

  // 모달 닫힐 때 상태 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTemplateId("")
    }
    onOpenChange(isOpen)
  }

  return (
    <ResponsiveModal open={open} onOpenChange={handleOpenChange} mobileVariant="sheet">
      <ResponsiveModalContent className="sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <ResponsiveModalHeader>
          <ResponsiveModalTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            코스 적용
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            코스을 선택하여 해당 날짜에 근무기록을 일괄 생성합니다.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 px-4 sm:px-1">
          {/* 적용 날짜 */}
          <div className="space-y-2">
            <Label>적용 날짜</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
              {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
            </div>
          </div>

          {/* 코스 선택 */}
          <div className="space-y-2">
            <Label htmlFor="template">코스 선택</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="코스을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {template.memberCount}개 매장
                        </span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-400">
                    등록된 코스이 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 코스 정보 */}
          {selectedTemplate && (
            <>
              {/* 설명 */}
              {selectedTemplate.description && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">설명</p>
                  <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
                </div>
              )}

              {/* 제외된 매장 섹션 */}
              {excludedStores.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-2">
                    제외된 매장 ({excludedStores.length}개)
                  </p>
                  <div className="space-y-2">
                    {excludedStores.map((store) => (
                      <div
                        key={store.id}
                        className="bg-white rounded p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {store.name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="size-3 flex-shrink-0" />
                            {store.address}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">
                            {store.visitInfo}
                          </p>
                          <p className="text-amber-600 text-xs mt-1 font-medium">
                            {excludeReasonLabels[store.reason]}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 생성 불가 안내 */}
              {createCount === 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500 px-1">
                  <Info className="size-4 text-gray-400 flex-shrink-0" />
                  <span>이 날짜에 생성할 매장이 없습니다</span>
                </div>
              )}
            </>
          )}
        </div>

        <ResponsiveModalFooter className="gap-2 sm:gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={applyMutation.isPending}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={!selectedTemplateId || applyMutation.isPending || createCount === 0}
          >
            {applyMutation.isPending ? "적용 중..." : `적용 (${createCount}개)`}
          </Button>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  )
}
