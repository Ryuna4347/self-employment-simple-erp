import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { startOfDayKST, toKSTDateString } from "@/lib/date-utils"

export const dynamic = "force-dynamic"

const VALID_FREQUENCIES = ["WEEKLY", "MONTHLY"] as const
type Frequency = (typeof VALID_FREQUENCIES)[number]

/**
 * 고정비용 자동 생성 크론 핸들러
 *
 * cron-job.org에서 주기별로 호출:
 * - ?frequency=WEEKLY  → 매주 월요일 (0 0 * * 1)
 * - ?frequency=MONTHLY → 매월 1일   (0 0 1 * *)
 */
export async function GET(request: NextRequest) {
  // 1. CRON_SECRET 인증 검증
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  console.log("[크론 디버그]", {
    hasCronSecret: !!cronSecret,
    cronSecretLength: cronSecret?.length,
    authHeader: authHeader?.substring(0, 20) + "...",
    match: authHeader === `Bearer ${cronSecret}`,
  })

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return ApiErrors.unauthorized("유효하지 않은 크론 인증입니다")
  }

  // 2. frequency 쿼리 파라미터 검증
  const frequency = request.nextUrl.searchParams.get("frequency") as Frequency | null

  if (!frequency || !VALID_FREQUENCIES.includes(frequency)) {
    return ApiErrors.validationError("frequency 파라미터가 필요합니다 (WEEKLY 또는 MONTHLY)")
  }

  try {
    const now = new Date()
    const todayMidnight = startOfDayKST(now)
    const todayEnd = new Date(todayMidnight.getTime() + 24 * 60 * 60 * 1000)

    // 3. 활성 고정비용 중 해당 주기 조회
    const recurringCosts = await prisma.recurringCost.findMany({
      where: { isActive: true, frequency },
    })

    if (recurringCosts.length === 0) {
      return apiSuccess({ generated: 0, date: toKSTDateString(now), items: [] })
    }

    // 4. 오늘 이미 생성된 자동생성 Expense 조회 (중복 방지)
    const existingExpenses = await prisma.expense.findMany({
      where: {
        date: { gte: todayMidnight, lt: todayEnd },
        title: { startsWith: "[자동생성]" },
      },
      select: { title: true },
    })

    const existingTitles = new Set(existingExpenses.map((e) => e.title))

    // 5. 아직 생성되지 않은 고정비용만 필터
    const toGenerate = recurringCosts.filter(
      (rc) => !existingTitles.has(`[자동생성] ${rc.name}`)
    )

    if (toGenerate.length === 0) {
      return apiSuccess({ generated: 0, date: toKSTDateString(now), items: [] })
    }

    // 6. 트랜잭션으로 Expense 일괄 생성
    await prisma.$transaction(
      toGenerate.map((rc) =>
        prisma.expense.create({
          data: {
            date: todayMidnight,
            title: `[자동생성] ${rc.name}`,
            amount: rc.amount,
            description: "고정비용 자동 생성",
            userId: rc.userId,
          },
        })
      )
    )

    const generatedCount = toGenerate.length
    console.log(`[크론] 고정비용 자동 생성 완료: ${generatedCount}건 [${frequency}] (${toKSTDateString(now)})`)

    return apiSuccess({
      generated: generatedCount,
      date: toKSTDateString(now),
      items: toGenerate.map((rc) => ({ name: rc.name, amount: rc.amount })),
    })
  } catch (error) {
    console.error("고정비용 자동 생성 크론 오류:", error)
    return ApiErrors.internalError("고정비용 자동 생성 중 오류가 발생했습니다")
  }
}
