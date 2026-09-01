import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { dateToKSTEndOfDay, dateToKSTMidnight, toKSTDateString } from "@/lib/date-utils"

/**
 * 일별 매출 집계 / 스냅샷
 *
 * 수금 처리가 과거 매출을 파괴하기 때문에 존재하는 모듈이다.
 * - consolidateAndCollect (src/lib/collection-utils.ts): 마지막 건을 뺀 모든
 *   RecordItem.amount 를 0 으로 만들고, 누적액을 마지막 건에
 *   `이월 수금 (yyyy-MM-dd)` 항목으로 옮긴다. → 과거 매출이 미래로 이동
 * - 미수금 일괄 수금 (src/app/api/admin/outstanding/batch-collect): 이월 항목
 *   없이 amount 를 0 으로 만든다. → 매출이 흔적 없이 소멸
 *
 * 그래서 원장(WorkRecord/RecordItem)만 보고 계산하면 과거 날짜가 0 원이 된다.
 * 매일 밤 크론이 computeDailySales 로 계산한 값을 DailySalesSnapshot 에 고정한다.
 */

/** 이월 수금 마커 항목명. consolidateAndCollect 가 생성하는 형식과 맞춰야 한다. */
const CARRYOVER_NAME_REGEX = "^이월 수금 \\(\\d{4}-\\d{2}-\\d{2}\\)$"
const CARRYOVER_DATE_REGEX = "\\d{4}-\\d{2}-\\d{2}"

export interface DailySalesRow {
  /** "YYYY-MM-DD" (KST) */
  date: string
  totalRevenue: number
  cashRevenue: number
  accountRevenue: number
  cardRevenue: number
  recordCount: number
  storeCount: number
}

export type SnapshotAction = "created" | "updated" | "kept"

export interface SnapshotResult {
  date: string
  action: SnapshotAction
  totalRevenue: number
}

interface DailySalesQueryRow {
  day: string
  total: bigint
  cash: bigint
  account: bigint
  card: bigint
  record_count: bigint
  store_count: bigint
}

function emptyRow(date: string): DailySalesRow {
  return {
    date,
    totalRevenue: 0,
    cashRevenue: 0,
    accountRevenue: 0,
    cardRevenue: 0,
    recordCount: 0,
    storeCount: 0,
  }
}

/** "YYYY-MM-DD" 범위를 하루 단위 문자열 배열로 (KST 기준, 양끝 포함) */
export function enumerateKSTDates(from: string, to: string): string[] {
  const dates: string[] = []
  const end = new Date(`${to}T00:00:00.000Z`).getTime()
  let cursor = new Date(`${from}T00:00:00.000Z`).getTime()

  while (cursor <= end) {
    dates.push(new Date(cursor).toISOString().slice(0, 10))
    cursor += 24 * 60 * 60 * 1000
  }

  return dates
}

/**
 * 원장에서 KST 일별 매출을 직접 계산한다.
 *
 * 이월 수금 마커는 항목명에 박힌 원래 날짜로 되돌려 귀속시킨다. 이렇게 하면
 * ① 이월분을 받은 레코드의 날짜가 부풀지 않고 ② 이월분을 뺏긴 원래 날짜가
 * 복원된다. 원본 항목은 이미 amount = 0 이라 마커를 더해도 중복되지 않는다.
 *
 * 다만 마커의 결제유형은 마커를 보유한 레코드 기준이라, 합계는 정확하지만
 * 현금/계좌/카드 분해는 근사값이다.
 *
 * 반환값은 범위 내 모든 날짜를 포함한다(기록이 없는 날은 0 원 행).
 */
export async function computeDailySales(from: string, to: string): Promise<DailySalesRow[]> {
  const fromMidnight = dateToKSTMidnight(from)
  const toEndOfDay = dateToKSTEndOfDay(to)

  // date 컬럼은 timestamp without time zone 이므로 UTC 로 해석 후 KST 로 변환해야 한다.
  const toKST = Prisma.raw("AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Seoul'")

  const rows = await prisma.$queryRaw<DailySalesQueryRow[]>`
    WITH item AS (
      SELECT
        CASE
          WHEN ri.name ~ ${CARRYOVER_NAME_REGEX}
            THEN substring(ri.name, ${CARRYOVER_DATE_REGEX})::date
          ELSE (wr.date ${toKST})::date
        END AS day,
        wr."paymentTypeSnapshot" AS payment_type,
        ri.amount AS amount
      FROM "RecordItem" ri
      JOIN "WorkRecord" wr ON wr.id = ri."workRecordId"
      -- 이월 마커는 항상 원래 날짜 이후의 레코드에 붙으므로 하한만 pruning 가능하다.
      WHERE wr.date >= ${fromMidnight}
    ),
    revenue AS (
      SELECT
        day,
        COALESCE(SUM(amount), 0) AS total,
        COALESCE(SUM(amount) FILTER (WHERE payment_type = 'CASH'), 0) AS cash,
        COALESCE(SUM(amount) FILTER (WHERE payment_type = 'ACCOUNT'), 0) AS account,
        COALESCE(SUM(amount) FILTER (WHERE payment_type = 'CARD'), 0) AS card
      FROM item
      WHERE day >= ${from}::date AND day <= ${to}::date
      GROUP BY day
    ),
    visits AS (
      SELECT
        (wr.date ${toKST})::date AS day,
        COUNT(*) AS record_count,
        COUNT(DISTINCT wr."storeId") AS store_count
      FROM "WorkRecord" wr
      WHERE wr.date >= ${fromMidnight} AND wr.date <= ${toEndOfDay}
      GROUP BY 1
    )
    SELECT
      to_char(COALESCE(r.day, v.day), 'YYYY-MM-DD') AS day,
      COALESCE(r.total, 0) AS total,
      COALESCE(r.cash, 0) AS cash,
      COALESCE(r.account, 0) AS account,
      COALESCE(r.card, 0) AS card,
      COALESCE(v.record_count, 0) AS record_count,
      COALESCE(v.store_count, 0) AS store_count
    FROM revenue r
    FULL OUTER JOIN visits v ON r.day = v.day
    ORDER BY 1
  `

  const byDate = new Map(
    rows.map((row) => [
      // to_char 로 텍스트화했으므로 드라이버의 DATE 파싱 타임존에 영향받지 않는다.
      row.day,
      {
        date: row.day,
        totalRevenue: Number(row.total),
        cashRevenue: Number(row.cash),
        accountRevenue: Number(row.account),
        cardRevenue: Number(row.card),
        recordCount: Number(row.record_count),
        storeCount: Number(row.store_count),
      },
    ])
  )

  // 기록이 없는 날도 0 원 행으로 채워 호출부가 빈 구간을 따로 보정하지 않게 한다.
  return enumerateKSTDates(from, to).map((date) => byDate.get(date) ?? emptyRow(date))
}

/**
 * 계산 결과를 DailySalesSnapshot 에 저장한다.
 *
 * 기본은 단조 증가 가드: 재계산값이 기존 스냅샷보다 낮으면 기존값을 유지한다.
 * 미수금 일괄 수금 경로는 이월 마커를 남기지 않아 복구가 불가능하므로,
 * 재실행이 이미 확보한 매출을 깎아내리지 않도록 막는 장치다.
 * 정당한 하향 정정(금액 오타, 기록 삭제)은 force 로 덮어쓴다.
 */
export async function snapshotDailySales(
  from: string,
  to: string,
  opts: { force?: boolean } = {}
): Promise<SnapshotResult[]> {
  const computed = await computeDailySales(from, to)
  const existing = await prisma.dailySalesSnapshot.findMany({
    where: {
      date: { gte: dateToKSTMidnight(from), lte: dateToKSTEndOfDay(to) },
    },
  })
  const existingByDate = new Map(
    existing.map((row) => [toKSTDateString(row.date), row])
  )

  const results: SnapshotResult[] = []
  const writes: Prisma.PrismaPromise<unknown>[] = []

  for (const row of computed) {
    const date = row.date
    const prev = existingByDate.get(date)

    if (prev && !opts.force && row.totalRevenue < prev.totalRevenue) {
      results.push({ date, action: "kept", totalRevenue: prev.totalRevenue })
      continue
    }

    const data = {
      totalRevenue: row.totalRevenue,
      cashRevenue: row.cashRevenue,
      accountRevenue: row.accountRevenue,
      cardRevenue: row.cardRevenue,
      recordCount: row.recordCount,
      storeCount: row.storeCount,
    }

    writes.push(
      prisma.dailySalesSnapshot.upsert({
        where: { date: dateToKSTMidnight(date) },
        create: { date: dateToKSTMidnight(date), ...data },
        update: data,
      })
    )
    results.push({
      date,
      action: prev ? "updated" : "created",
      totalRevenue: row.totalRevenue,
    })
  }

  if (writes.length > 0) {
    await prisma.$transaction(writes)
  }

  return results
}

/**
 * 조회용 일별 매출 시리즈.
 *
 * 스냅샷이 있는 날짜는 스냅샷 값을, 없는 날짜(오늘 / 크론 가동 이전)는
 * 원장 계산값을 쓴다. 두 경로가 같은 계산식을 쓰므로 크론 시작일에
 * 그래프가 끊기지 않는다.
 */
export async function getDailySalesSeries(from: string, to: string): Promise<DailySalesRow[]> {
  const [computed, snapshots] = await Promise.all([
    computeDailySales(from, to),
    prisma.dailySalesSnapshot.findMany({
      where: {
        date: { gte: dateToKSTMidnight(from), lte: dateToKSTEndOfDay(to) },
      },
    }),
  ])

  const byDate = new Map(computed.map((row) => [row.date, row]))

  for (const snapshot of snapshots) {
    const date = toKSTDateString(snapshot.date)
    byDate.set(date, {
      date,
      totalRevenue: snapshot.totalRevenue,
      cashRevenue: snapshot.cashRevenue,
      accountRevenue: snapshot.accountRevenue,
      cardRevenue: snapshot.cardRevenue,
      recordCount: snapshot.recordCount,
      storeCount: snapshot.storeCount,
    })
  }

  return enumerateKSTDates(from, to).map((date) => byDate.get(date) ?? emptyRow(date))
}
