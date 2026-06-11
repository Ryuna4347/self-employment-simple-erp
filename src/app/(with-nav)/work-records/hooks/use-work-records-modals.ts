"use client"

import { useState } from "react"
import type { WorkRecordResponse } from "./use-work-records"

/**
 * 근무기록 화면의 모달 상태 묶음 훅
 *
 * work-records-client에 흩어져 있던 모달 7개의 open 상태와
 * 수정/수금요청 대상 레코드, 열기 핸들러를 한곳에 모은다. (동작 동일)
 */
export function useWorkRecordsModals() {
  const [workRecordModalOpen, setWorkRecordModalOpen] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false)
  const [collectionRequestModalOpen, setCollectionRequestModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<WorkRecordResponse | null>(null)
  const [collectionRequestTarget, setCollectionRequestTarget] =
    useState<WorkRecordResponse | null>(null)
  const [fuelCostModalOpen, setFuelCostModalOpen] = useState(false)
  const [repairCostModalOpen, setRepairCostModalOpen] = useState(false)
  const [dailyCashModalOpen, setDailyCashModalOpen] = useState(false)

  // 근무기록 추가 모달 열기
  const openAddRecord = () => {
    setEditingRecord(null)
    setWorkRecordModalOpen(true)
  }

  // 근무기록 수정 모달 열기
  const openEditRecord = (record: WorkRecordResponse) => {
    setEditingRecord(record)
    setWorkRecordModalOpen(true)
  }

  // 코스 적용 모달 열기
  const openApplyTemplate = () => {
    setTemplateModalOpen(true)
  }

  // 수금 확인 요청 모달 열기
  const openRequestCollect = (record: WorkRecordResponse) => {
    setCollectionRequestTarget(record)
    setCollectionRequestModalOpen(true)
  }

  return {
    workRecordModalOpen,
    setWorkRecordModalOpen,
    templateModalOpen,
    setTemplateModalOpen,
    bulkDeleteModalOpen,
    setBulkDeleteModalOpen,
    collectionRequestModalOpen,
    setCollectionRequestModalOpen,
    editingRecord,
    collectionRequestTarget,
    fuelCostModalOpen,
    setFuelCostModalOpen,
    repairCostModalOpen,
    setRepairCostModalOpen,
    dailyCashModalOpen,
    setDailyCashModalOpen,
    openAddRecord,
    openEditRecord,
    openApplyTemplate,
    openRequestCollect,
  }
}
