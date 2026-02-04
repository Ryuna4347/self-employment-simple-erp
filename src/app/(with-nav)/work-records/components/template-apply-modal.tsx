"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { MapPin, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
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

interface TemplateApplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
}

export function TemplateApplyModal({
  open,
  onOpenChange,
  selectedDate,
}: TemplateApplyModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")

  // 템플릿 목록 조회
  const { data: templates = [], isLoading: isLoadingTemplates } = useStoreTemplates()

  // 템플릿 적용 mutation
  const applyMutation = useApplyStoreTemplate()

  // 선택된 템플릿 정보
  const selectedTemplate = useMemo<StoreTemplate | undefined>(() => {
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId])

  // 템플릿 적용 핸들러
  const handleApply = () => {
    if (!selectedTemplateId) return

    const dateStr = format(selectedDate, "yyyy-MM-dd")
    applyMutation.mutate(
      { id: selectedTemplateId, date: dateStr },
      {
        onSuccess: (result) => {
          // 성공 시 모달 닫기
          onOpenChange(false)
          setSelectedTemplateId("")

          // 결과 알림 (토스트 대신 alert 사용 - 추후 토스트로 교체 가능)
          if (result.skipped > 0) {
            alert(
              `${result.created}개 기록이 생성되었습니다.\n(${result.skipped}개 매장은 이미 기록이 있어 건너뛰었습니다.)`
            )
          } else {
            alert(`${result.created}개 기록이 생성되었습니다.`)
          }
        },
        onError: () => {
          alert("템플릿 적용에 실패했습니다.")
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-5" />
            템플릿 적용
          </DialogTitle>
          <DialogDescription>
            템플릿을 선택하여 해당 날짜에 근무기록을 일괄 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 적용 날짜 */}
          <div className="space-y-2">
            <Label>적용 날짜</Label>
            <div className="px-3 py-2 bg-gray-50 rounded-md text-sm">
              {format(selectedDate, "yyyy년 M월 d일 (EEEE)", { locale: ko })}
            </div>
          </div>

          {/* 템플릿 선택 */}
          <div className="space-y-2">
            <Label htmlFor="template">템플릿 선택</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger id="template">
                <SelectValue placeholder="템플릿을 선택하세요" />
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
                    등록된 템플릿이 없습니다
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 템플릿 정보 */}
          {selectedTemplate && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              {/* 설명 */}
              {selectedTemplate.description && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">설명</p>
                  <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
                </div>
              )}

              {/* 포함된 매장 목록 */}
              <div>
                <p className="text-xs text-gray-500 mb-2">
                  포함된 매장 ({selectedTemplate.memberCount}개)
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedTemplate.members
                    .sort((a, b) => a.order - b.order)
                    .slice(0, 5)
                    .map((member, index) => (
                      <div
                        key={member.id}
                        className="flex items-start gap-2 text-sm bg-white rounded p-2"
                      >
                        <span className="text-gray-400 text-xs min-w-[20px]">
                          {index + 1}.
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {member.store.name}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                            <MapPin className="size-3 flex-shrink-0" />
                            {member.store.address}
                          </p>
                        </div>
                      </div>
                    ))}
                  {selectedTemplate.memberCount > 5 && (
                    <p className="text-xs text-gray-400 text-center py-1">
                      외 {selectedTemplate.memberCount - 5}개 매장
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
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
            disabled={!selectedTemplateId || applyMutation.isPending}
          >
            {applyMutation.isPending ? "적용 중..." : "적용"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
