import ExcelJS from "exceljs"
import { prisma } from "@/lib/prisma"
import { startOfMonthKST, endOfMonthKST } from "@/lib/date-utils"
import type {
  SheetData,
  EmployeeBlock,
  StoreAggregation,
  MonthlySummaryData,
  Weekday,
  WeekGroup,
} from "./types"
import { WEEKDAY_LABELS } from "./types"
import {
  getDateClassification,
  parseShortAddress,
  getPaymentTypeLabel,
} from "./utils"

// ── 데이터 조회 ──

async function fetchMonthlyData(year: number, month: number) {
  const dateStart = startOfMonthKST(year, month)
  const dateEnd = endOfMonthKST(year, month)

  const [workRecords, expenses] = await Promise.all([
    prisma.workRecord.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
      },
      include: {
        items: { select: { amount: true } },
        user: { select: { id: true, name: true } },
        store: { select: { visitCycleWeeks: true } },
      },
      orderBy: { date: "asc" },
    }),
    prisma.expense.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
      },
      select: { amount: true },
    }),
  ])

  return { workRecords, expenses }
}

// ── 데이터 분류/집계 ──

type WorkRecordWithRelations = Awaited<
  ReturnType<typeof fetchMonthlyData>
>["workRecords"][number]

interface AggregatedStore {
  storeName: string
  shortAddress: string
  paymentType: string
  totalAmount: number
  userName: string
}

function aggregateByWeekdayAndGroup(
  records: WorkRecordWithRelations[]
): SheetData[] {
  // Map: weekday → weekGroup → userId → storeKey → AggregatedStore
  const grouped = new Map<
    Weekday,
    Map<WeekGroup, Map<string, Map<string, AggregatedStore>>>
  >()

  for (const record of records) {
    const classification = getDateClassification(record.date)
    if (!classification) continue // 토/일 제외

    const { weekday, weekGroup } = classification
    const recordTotal = record.items.reduce(
      (sum, item) => sum + item.amount,
      0
    )

    // 중첩 Map 초기화
    if (!grouped.has(weekday)) grouped.set(weekday, new Map())
    const weekdayMap = grouped.get(weekday)!
    if (!weekdayMap.has(weekGroup)) weekdayMap.set(weekGroup, new Map())
    const groupMap = weekdayMap.get(weekGroup)!
    if (!groupMap.has(record.userId)) groupMap.set(record.userId, new Map())
    const userMap = groupMap.get(record.userId)!

    // 매장 키: storeId 또는 storeNameSnapshot (직접 입력 매장)
    const storeKey = record.storeId ?? record.storeNameSnapshot ?? "unknown"
    const existing = userMap.get(storeKey)

    if (existing) {
      existing.totalAmount += recordTotal
    } else {
      userMap.set(storeKey, {
        storeName: record.storeNameSnapshot ?? "알 수 없음",
        shortAddress: parseShortAddress(record.storeAddressSnapshot),
        paymentType: record.paymentTypeSnapshot,
        totalAmount: recordTotal,
        userName: record.user.name,
      })
    }
  }

  // Map → SheetData[] 변환
  const sheetsData: SheetData[] = []
  const weekdays: Weekday[] = [1, 2, 3, 4, 5]
  const weekGroups: WeekGroup[] = [1, 2]

  for (const weekday of weekdays) {
    for (const weekGroup of weekGroups) {
      const sheetName = `${WEEKDAY_LABELS[weekday]} ${weekGroup}주차`
      const groupMap = grouped.get(weekday)?.get(weekGroup)

      if (!groupMap || groupMap.size === 0) {
        sheetsData.push({ sheetName, employeeBlocks: [], sheetTotal: 0 })
        continue
      }

      const employeeBlocks: EmployeeBlock[] = []
      let sheetTotal = 0

      for (const [, userStores] of groupMap) {
        const stores: StoreAggregation[] = []
        let subtotal = 0

        for (const [, storeData] of userStores) {
          stores.push({
            storeName: storeData.storeName,
            shortAddress: storeData.shortAddress,
            paymentType: storeData.paymentType as StoreAggregation["paymentType"],
            totalAmount: storeData.totalAmount,
          })
          subtotal += storeData.totalAmount
        }

        const firstStore = userStores.values().next().value!
        employeeBlocks.push({
          employeeName: firstStore.userName,
          stores,
          subtotal,
        })
        sheetTotal += subtotal
      }

      sheetsData.push({ sheetName, employeeBlocks, sheetTotal })
    }
  }

  return sheetsData
}

// ── 월간 합계 계산 ──

function calculateMonthlySummary(
  workRecords: WorkRecordWithRelations[],
  expenses: { amount: number }[]
): MonthlySummaryData {
  const revenueTotal = workRecords.reduce(
    (sum, r) =>
      sum +
      r.items.reduce(
        (itemSum, item) => itemSum + item.amount,
        0
      ),
    0
  )
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  return {
    expenseTotal,
    revenueTotal,
    netProfit: revenueTotal - expenseTotal,
  }
}

// ── 스타일 상수 ──

const COLORS = {
  titleBg: "FFD9E2F3", // 연한 파랑
  employeeBg: "FFF2F2F2", // 연한 회색
  summaryBg: "FFFFF2CC", // 연한 노랑
  separatorBg: "FFE8E8E8", // 구분 열 배경
} as const

const BORDER_THIN: Partial<ExcelJS.Border> = { style: "thin" }

// ── 요일 시트 생성 (가로 배치) ──

function buildWeekdaySheet(workbook: ExcelJS.Workbook, data: SheetData) {
  const sheet = workbook.addWorksheet(data.sheetName)
  const blocks = data.employeeBlocks
  const blockCount = blocks.length

  if (blockCount === 0) {
    // 데이터 없는 시트: 제목만 표기
    const titleRow = sheet.addRow([data.sheetName])
    titleRow.getCell(1).font = { bold: true, size: 14 }
    titleRow.getCell(1).alignment = { horizontal: "center" }
    sheet.addRow([])
    sheet.addRow(["데이터 없음"])
    return
  }

  // 열 너비 설정: 각 직원 블록 = 4열 + 구분 1열
  const COLS_PER_BLOCK = 4
  const GAP_COL = 1
  const totalCols =
    blockCount * COLS_PER_BLOCK + (blockCount - 1) * GAP_COL

  for (let i = 0; i < blockCount; i++) {
    const startCol = i * (COLS_PER_BLOCK + GAP_COL) + 1
    sheet.getColumn(startCol).width = 18 // 매장명
    sheet.getColumn(startCol + 1).width = 14 // 주소
    sheet.getColumn(startCol + 2).width = 8 // 결제방법
    sheet.getColumn(startCol + 3).width = 13 // 매출

    // 구분 열
    if (i < blockCount - 1) {
      const gapCol = startCol + COLS_PER_BLOCK
      sheet.getColumn(gapCol).width = 2
    }
  }

  // Row 1: 시트명 (전체 병합)
  const titleRow = sheet.addRow([])
  titleRow.getCell(1).value = data.sheetName
  titleRow.getCell(1).font = { bold: true, size: 14 }
  titleRow.getCell(1).alignment = { horizontal: "center" }
  titleRow.getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.titleBg },
  }
  if (totalCols > 1) {
    sheet.mergeCells(1, 1, 1, totalCols)
  }

  // Row 2: 직원명 헤더
  const empRow = sheet.addRow([])
  for (let i = 0; i < blockCount; i++) {
    const startCol = i * (COLS_PER_BLOCK + GAP_COL) + 1
    empRow.getCell(startCol).value = blocks[i].employeeName
    empRow.getCell(startCol).font = { bold: true, size: 12 }
    empRow.getCell(startCol).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.employeeBg },
    }
    empRow.getCell(startCol).alignment = { horizontal: "center" }
    // 4열 병합
    sheet.mergeCells(2, startCol, 2, startCol + COLS_PER_BLOCK - 1)
  }

  // Row 3: 열 헤더 (매장명, 주소, 결제방법, 매출)
  const headerRow = sheet.addRow([])
  for (let i = 0; i < blockCount; i++) {
    const startCol = i * (COLS_PER_BLOCK + GAP_COL) + 1
    const headers = ["매장명", "주소", "결제방법", "매출"]
    headers.forEach((h, j) => {
      const cell = headerRow.getCell(startCol + j)
      cell.value = h
      cell.font = { bold: true }
      cell.alignment = { horizontal: "center" }
      cell.border = { bottom: BORDER_THIN }
    })
  }

  // 데이터 행: 매장 수가 가장 많은 직원 기준으로 행 수 결정
  const maxStores = Math.max(...blocks.map((b) => b.stores.length))

  for (let row = 0; row < maxStores; row++) {
    const dataRow = sheet.addRow([])
    for (let i = 0; i < blockCount; i++) {
      const startCol = i * (COLS_PER_BLOCK + GAP_COL) + 1
      const store = blocks[i].stores[row]
      if (store) {
        dataRow.getCell(startCol).value = store.storeName
        dataRow.getCell(startCol + 1).value = store.shortAddress
        dataRow.getCell(startCol + 2).value = getPaymentTypeLabel(
          store.paymentType
        )
        dataRow.getCell(startCol + 2).alignment = { horizontal: "center" }
        dataRow.getCell(startCol + 3).value = store.totalAmount
        dataRow.getCell(startCol + 3).numFmt = "#,##0"
        dataRow.getCell(startCol + 3).alignment = { horizontal: "right" }
      }
    }
  }

  // 소계 행
  const subtotalRow = sheet.addRow([])
  for (let i = 0; i < blockCount; i++) {
    const startCol = i * (COLS_PER_BLOCK + GAP_COL) + 1
    subtotalRow.getCell(startCol).value = "소계"
    subtotalRow.getCell(startCol).font = { bold: true }
    subtotalRow.getCell(startCol + 3).value = blocks[i].subtotal
    subtotalRow.getCell(startCol + 3).font = { bold: true }
    subtotalRow.getCell(startCol + 3).numFmt = "#,##0"
    subtotalRow.getCell(startCol + 3).alignment = { horizontal: "right" }
    subtotalRow.getCell(startCol + 3).border = { top: BORDER_THIN }
  }

  // 빈 행
  sheet.addRow([])

  // 합계 행
  const totalRow = sheet.addRow([])
  totalRow.getCell(1).value = "합계"
  totalRow.getCell(1).font = { bold: true, size: 12 }
  totalRow.getCell(1).alignment = { horizontal: "right" }
  // 마지막 블록의 매출 열에 시트 합계 표기
  const lastBlockAmountCol =
    (blockCount - 1) * (COLS_PER_BLOCK + GAP_COL) + COLS_PER_BLOCK
  totalRow.getCell(lastBlockAmountCol).value = data.sheetTotal
  totalRow.getCell(lastBlockAmountCol).font = { bold: true, size: 12 }
  totalRow.getCell(lastBlockAmountCol).numFmt = "#,##0"
  totalRow.getCell(lastBlockAmountCol).alignment = { horizontal: "right" }
  totalRow.getCell(lastBlockAmountCol).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: COLORS.titleBg },
  }
}

// ── 월간 합계 시트 생성 ──

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  data: MonthlySummaryData,
  year: number,
  month: number
) {
  const sheet = workbook.addWorksheet("월간 합계")

  sheet.getColumn(1).width = 25
  sheet.getColumn(2).width = 20

  // 제목
  const titleRow = sheet.addRow([`${year}년 ${month}월 월간 합계`, ""])
  sheet.mergeCells(titleRow.number, 1, titleRow.number, 2)
  titleRow.getCell(1).font = { bold: true, size: 16 }
  titleRow.getCell(1).alignment = { horizontal: "center" }

  sheet.addRow([])

  // 경비 수기 작성 영역 라벨
  const expLabelRow = sheet.addRow(["[ 경비 수기 작성 영역 ]", ""])
  expLabelRow.getCell(1).font = { bold: true, color: { argb: "FF666666" } }

  // 수기 작성 영역 헤더
  const expHeaderRow = sheet.addRow(["항목", "금액"])
  expHeaderRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.alignment = { horizontal: "center" }
    cell.border = { bottom: BORDER_THIN }
  })

  // 10개 빈 행 (경비 수기 작성용)
  for (let i = 0; i < 10; i++) {
    const row = sheet.addRow(["", ""])
    row.eachCell((cell) => {
      cell.border = {
        left: BORDER_THIN,
        right: BORDER_THIN,
        bottom: { style: "hair" },
      }
    })
  }

  sheet.addRow([])

  // 지출합산
  const expRow = sheet.addRow(["지출합산", data.expenseTotal])
  expRow.getCell(1).font = { bold: true }
  expRow.getCell(2).numFmt = "#,##0"
  expRow.getCell(2).alignment = { horizontal: "right" }

  // 매출합산
  const revRow = sheet.addRow(["매출합산", data.revenueTotal])
  revRow.getCell(1).font = { bold: true }
  revRow.getCell(2).numFmt = "#,##0"
  revRow.getCell(2).alignment = { horizontal: "right" }

  // 순이익
  const netRow = sheet.addRow(["순이익", data.netProfit])
  netRow.getCell(1).font = { bold: true, size: 13 }
  netRow.getCell(2).font = { bold: true, size: 13 }
  netRow.getCell(2).numFmt = "#,##0"
  netRow.getCell(2).alignment = { horizontal: "right" }
  netRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: COLORS.summaryBg },
    }
    cell.border = {
      top: { style: "medium" },
      bottom: { style: "medium" },
    }
  })
}

// ── 메인 함수 ──

export async function generateMonthlyReport(
  year: number,
  month: number // 1~12
): Promise<Buffer> {
  // 1. 데이터 조회
  const { workRecords, expenses } = await fetchMonthlyData(year, month)

  // 2. 요일별/주차별 데이터 분류 및 집계
  const sheetsData = aggregateByWeekdayAndGroup(workRecords)

  // 3. 월간 합계 계산
  const summaryData = calculateMonthlySummary(workRecords, expenses)

  // 4. Excel 워크북 생성
  const workbook = new ExcelJS.Workbook()
  workbook.creator = "Small-Shop ERP"
  workbook.created = new Date()

  // 요일별 시트 생성 (10 sheets)
  for (const sheetData of sheetsData) {
    buildWeekdaySheet(workbook, sheetData)
  }

  // 월간 합계 시트
  buildSummarySheet(workbook, summaryData, year, month)

  // 5. Buffer로 반환
  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
