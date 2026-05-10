import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { apiSuccess, ApiErrors } from "@/lib/api-response"
import { sendAligoSms } from "@/lib/sms/aligo-sms"
import { getYesterdayCashCollectionByEmployee } from "@/lib/reports/daily-cash-collection"
import { formatDailyCashBody } from "@/lib/sms/format-daily-cash"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return ApiErrors.unauthorized("유효하지 않은 크론 인증입니다")
  }

  try {
    const summary = await getYesterdayCashCollectionByEmployee()
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isDeleted: false, phoneNumber: { not: null } },
      select: { id: true, name: true, phoneNumber: true },
    })

    if (admins.length === 0) {
      return apiSuccess({
        skipped: true,
        reason: "발송 대상 ADMIN 휴대폰 번호가 없습니다",
        date: summary.dateLabel,
        employees: summary.rows.length,
        grandTotal: summary.grandTotal,
      })
    }

    const body = formatDailyCashBody(summary)
    const receivers = admins.flatMap((admin) =>
      admin.phoneNumber ? [admin.phoneNumber] : []
    )
    const result = await sendAligoSms({
      receivers,
      message: body,
      title: "수금알림",
    })

    console.log(
      `[크론] 일일 현금 수금 SMS: 수신자 ${admins.length}명 직원 ${summary.rows.length}명 합계 ${summary.grandTotal.toLocaleString("ko-KR")}원 resultCode=${result.resultCode}`
    )

    return apiSuccess({
      date: summary.dateLabel,
      recipients: admins.length,
      employees: summary.rows.length,
      grandTotal: summary.grandTotal,
      sms: {
        resultCode: result.resultCode,
        message: result.message,
        msgId: result.msgId,
      },
    })
  } catch (error) {
    console.error("일일 현금 수금 SMS 크론 오류:", error)
    return ApiErrors.internalError("일일 현금 수금 SMS 발송 중 오류가 발생했습니다")
  }
}
