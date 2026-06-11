"use client"

import { useEffect, useState } from "react"
import type { DefaultValues, FieldValues, UseFormReturn } from "react-hook-form"

interface UseCrudModalFormOptions<TValues extends FieldValues, TEntity> {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 수정 대상 엔티티 (null/undefined = 생성 모드) */
  editing: TEntity | null | undefined
  /** useForm은 각 모달이 직접 생성한다 (스키마/모드 제어권 유지) */
  form: UseFormReturn<TValues>
  /** 생성 모드 기본값 — 열 때마다 재평가되도록 함수형 (예: 오늘 날짜) */
  emptyValues: () => DefaultValues<TValues>
  /** 수정 대상 엔티티 → 폼 값 매핑 */
  toFormValues: (entity: TEntity) => DefaultValues<TValues>
  /** 폼 외 부가 상태 동기화 (드롭다운 reset, 선택 목록 복원 등) */
  onOpenSync?: (editing: TEntity | null) => void
  /** 닫을 때 form.reset() 호출 여부 (기본 true) */
  resetOnClose?: boolean
}

/**
 * CRUD 모달 공통 골격 훅
 *
 * 추가/수정 겸용 모달의 반복 패턴을 묶는다:
 * - 모달이 열릴 때 수정 모드면 엔티티 값으로, 아니면 빈 값으로 폼 reset
 * - isEditing은 열림 시점 스냅샷 기반 — 닫힘 애니메이션 중 부모가
 *   editing을 비워도 타이틀이 "수정"→"추가"로 깜빡이지 않는다
 * - submit에서는 editingSnapshot으로 수정 대상 id를 참조한다
 */
export function useCrudModalForm<TValues extends FieldValues, TEntity>({
  open,
  onOpenChange,
  editing,
  form,
  emptyValues,
  toFormValues,
  onOpenSync,
  resetOnClose = true,
}: UseCrudModalFormOptions<TValues, TEntity>) {
  const [editingSnapshot, setEditingSnapshot] = useState<TEntity | null>(null)

  // 모달 열림(open prop)을 트리거로 한 폼/부가 상태 동기화 — useEffect가 적합한 케이스.
  // emptyValues/toFormValues/onOpenSync는 렌더마다 새로 만들어지는 인라인 함수라
  // deps에 넣으면 매 렌더 재실행되므로 의도적으로 제외한다.
  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!open) return
    const entity = editing ?? null
    setEditingSnapshot(entity)
    form.reset(entity ? toFormValues(entity) : emptyValues())
    onOpenSync?.(entity)
  }, [open, editing])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && resetOnClose) {
      form.reset()
    }
    onOpenChange(nextOpen)
  }

  return {
    /** 열림 시점 스냅샷 기반 수정 모드 여부 */
    isEditing: !!editingSnapshot,
    /** submit에서 수정 대상 id 참조용 */
    editingSnapshot,
    handleOpenChange,
  }
}
