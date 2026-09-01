import { NextRequest } from "next/server"
import { z } from "zod"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { toKSTDateString } from "@/lib/date-utils"
import { snapshotDailySales } from "@/lib/reports/daily-sales"

export const dynamic = "force-dynamic"

/** 기본 롤링 윈도우 크기(일). 뒤늦게 입력된 기록과 점검 중 놓친 날을 복구한다. */
const DEFAULT_WINDOW_DAYS = 3

const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from 은 YYYY-MM-DD 형식이어야 합니다").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to 은 YYYY-MM-DD 형식이어야 합니다").optional(),
  force: z.enum(["true", "false"]).optional(),
})

/** KST 오늘 기준 offset 일 전의 "YYYY-MM-DD" */
function kstDaysAgo(offset: number): string {
  return toKSTDateString(new Date(Date.now() - offset * 24 * 60 * 60 * 1000))
}

/**
 * 일별 매출 스냅샷 크론 핸들러
 *
 * cron-job.org 에서 매일 호출: 00:10 KST = 15:10 UTC (`10 15 * * *`)
 * 헤더에 `Authorization: Bearer ${CRON_SECRET}` 필요.
 *
 * 파라미터 없이 호출하면 KST 기준 어제부터 3일 전까지를 재집계한다.
 * - 근무기록은 과거 날짜 입력이 가능하므로 뒤늦게 들어온 기록을 잡는다.
 * - MAINTENANCE_MODE 중에는 크론도 503 이므로 놓친 날을 자동 복구한다.
 * 재계산이 기존 스냅샷보다 낮으면 기존값을 유지한다(단조 증가 가드).
 * 정당한 하향 정정은 `?from=&to=&force=true` 로 수동 재계산한다.
 */
export async function GET(request: NextRequest) {
  // 1. CRON_SECRET 인증 검증
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return ApiErrors.unauthorized("유효하지 않은 크론 인증입니다")
  }

  // 2. 쿼리 파라미터 검증
  const searchParams = request.nextUrl.searchParams
  const parseResult = querySchema.safeParse({
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    force: searchParams.get("force") ?? undefined,
  })

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]
    return ApiErrors.validationError(firstError.message, [
      { field: firstError.path.join("."), message: firstError.message },
    ])
  }

  const { force } = parseResult.data
  const from = parseResult.data.from ?? kstDaysAgo(DEFAULT_WINDOW_DAYS)
  const to = parseResult.data.to ?? kstDaysAgo(1)

  if (from > to) {
    return ApiErrors.validationError("from 은 to 보다 이후일 수 없습니다")
  }

  try {
    const snapshots = await snapshotDailySales(from, to, { force: force === "true" })

    const created = snapshots.filter((s) => s.action === "created").length
    const updated = snapshots.filter((s) => s.action === "updated").length
    const kept = snapshots.filter((s) => s.action === "kept").length
    console.log(
      `[크론] 일별 매출 스냅샷 완료: ${from} ~ ${to} (생성 ${created} / 갱신 ${updated} / 유지 ${kept})`
    )

    return apiSuccess({ from, to, created, updated, kept, snapshots })
  } catch (error) {
    console.error("일별 매출 스냅샷 크론 오류:", error)
    return ApiErrors.internalError("일별 매출 스냅샷 생성 중 오류가 발생했습니다")
  }
}
