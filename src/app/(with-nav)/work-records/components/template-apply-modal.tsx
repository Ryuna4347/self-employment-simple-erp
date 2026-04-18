"use client"

import { useState, useMemo } from "react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { FileText } from "lucide-react"
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
import { useUsers } from "@/hooks/use-users"

interface TemplateApplyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: Date
  userId: string
}

export function TemplateApplyModal({
  open,
  onOpenChange,
  selectedDate,
  userId,
}: TemplateApplyModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [selectedUserId, setSelectedUserId] = useState<string>(userId)

  // 유저 목록 조회
  const { data: users } = useUsers()
  const currentUser = users?.find((u) => u.id === userId)
  const currentUserName = currentUser?.name || "나"

  // 코스 목록 조회 (선택된 유저 기준)
  const { data: templates = [], isLoading: isLoadingTemplates } = useStoreTemplates(selectedUserId)

  // 코스 적용 mutation
  const applyMutation = useApplyStoreTemplate()

  // 선택된 코스 정보
  const selectedTemplate = useMemo<StoreTemplate | undefined>(() => {
    return templates.find((t) => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId])

  // 입금자 미입력 매장 (계좌이체인데 managerName 없음)
  const missingManagerStores = useMemo(() => {
    if (!selectedTemplate) return []
    return selectedTemplate.members.filter(
      (m) => m.store.PaymentType === "ACCOUNT" && !m.store.managerName?.trim()
    )
  }, [selectedTemplate])

  // 생성될 매장 수 (입금자 미입력 매장 제외)
  const createCount = (selectedTemplate?.memberCount ?? 0) - missingManagerStores.length

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
          if (result.created > 0) {
            const parts = [`${result.created}개 기록이 생성되었습니다`]
            if (result.skipped > 0) parts.push(`중복 ${result.skipped}개 제외`)
            toast.success(parts.join(" · "))
          } else {
            toast.info("생성할 기록이 없습니다")
          }
        },
      }
    )
  }

  // 유저 변경 핸들러
  const handleUserChange = (newUserId: string) => {
    setSelectedUserId(newUserId)
    setSelectedTemplateId("")
  }

  // 모달 닫힐 때 상태 초기화
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedTemplateId("")
      setSelectedUserId(userId)
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

          {/* 코스 소유자 선택 */}
          <div className="space-y-2">
            <Label>코스 소유자</Label>
            <Select value={selectedUserId} onValueChange={handleUserChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={userId}>{currentUserName} (나)</SelectItem>
                {users?.filter((u) => u.id !== userId).map((user) => (
                  <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          {selectedTemplate && selectedTemplate.description && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">설명</p>
              <p className="text-sm text-gray-700">{selectedTemplate.description}</p>
            </div>
          )}

          {/* 입금자 미입력 매장 경고 */}
          {missingManagerStores.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm font-medium text-amber-800">
                입금자 미입력 매장 ({missingManagerStores.length}개)
              </p>
              <p className="text-xs text-amber-600 mt-1">
                계좌이체 매장인데 입금자가 없어 건너뜁니다:
              </p>
              <ul className="text-xs text-amber-700 mt-1 list-disc list-inside">
                {missingManagerStores.map((m) => (
                  <li key={m.id}>{m.store.name}</li>
                ))}
              </ul>
            </div>
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
