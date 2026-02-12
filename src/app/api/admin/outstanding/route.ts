import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { startOfMonth, endOfMonth, format } from "date-fns"

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const parseResult = querySchema.safeParse({
      year: searchParams.get("year") ?? undefined,
      month: searchParams.get("month") ?? undefined,
    })

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 },
      )
    }

    const { year, month } = parseResult.data

    // 날짜 범위 계산
    const targetDate = new Date(year, month - 1, 1)
    const dateStart = startOfMonth(targetDate)
    const dateEnd = endOfMonth(targetDate)

    // 미수금 근무기록 조회
    const workRecords = await prisma.workRecord.findMany({
      where: {
        date: { gte: dateStart, lte: dateEnd },
        isCollected: false,
      },
      include: {
        items: true,
        user: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    })

    // 응답 데이터 매핑
    const records = workRecords.map((record) => {
      const totalAmount = record.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      )

      return {
        id: record.id,
        date: format(record.date, "yyyy-MM-dd"),
        storeNameSnapshot: record.storeNameSnapshot,
        storeAddressSnapshot: record.storeAddressSnapshot,
        managerNameSnapshot: record.managerNameSnapshot,
        paymentTypeSnapshot: record.paymentTypeSnapshot,
        isCollected: record.isCollected,
        totalAmount,
        userName: record.user.name,
      }
    })

    // 요약 계산
    const totalOutstanding = records.reduce(
      (sum, record) => sum + record.totalAmount,
      0,
    )

    const summary = {
      totalOutstanding,
      count: records.length,
    }

    return NextResponse.json({
      success: true,
      data: {
        records,
        summary,
      },
    })
  } catch (error) {
    console.error("미수금 데이터 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "미수금 데이터 조회 중 오류가 발생했습니다" },
      { status: 500 },
    )
  }
}
