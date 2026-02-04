import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { ApiErrors } from "@/lib/api-response"
import { parseISO, startOfDay } from "date-fns"

// 적용 요청 스키마
const applySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식이어야 합니다"),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/store-templates/[id]/apply
 * 템플릿 적용 (WorkRecord 일괄 생성)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  try {
    // 템플릿 조회
    const template = await prisma.storeTemplate.findUnique({
      where: { id },
      include: {
        members: {
          orderBy: { order: "asc" },
          include: {
            store: {
              select: {
                id: true,
                name: true,
                PaymentType: true,
              },
            },
          },
        },
      },
    })

    if (!template) {
      return ApiErrors.notFound("템플릿을 찾을 수 없습니다")
    }

    if (template.userId !== user.id) {
      return ApiErrors.forbidden("다른 사용자의 템플릿입니다")
    }

    const body = await request.json()

    // 입력 검증
    const parseResult = applySchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { date } = parseResult.data
    const targetDate = startOfDay(parseISO(date))

    // 이미 해당 날짜에 같은 매장의 WorkRecord가 있는지 확인
    const existingRecords = await prisma.workRecord.findMany({
      where: {
        userId: user.id,
        date: targetDate,
        storeId: { in: template.members.map((m) => m.storeId) },
      },
      select: { storeId: true },
    })

    const existingStoreIds = new Set(existingRecords.map((r) => r.storeId))

    // 중복되지 않는 매장만 WorkRecord 생성
    const membersToCreate = template.members.filter(
      (m) => !existingStoreIds.has(m.storeId)
    )

    if (membersToCreate.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "해당 날짜에 이미 모든 매장의 근무 기록이 존재합니다",
        },
        { status: 400 }
      )
    }

    // WorkRecord 일괄 생성
    const workRecords = await prisma.$transaction(async (tx) => {
      const created = await Promise.all(
        membersToCreate.map((member) =>
          tx.workRecord.create({
            data: {
              date: targetDate,
              storeId: member.storeId,
              userId: user.id,
              isCollected: false,
              paymentTypeSnapshot: member.store.PaymentType,
            },
            include: {
              store: {
                select: { id: true, name: true, address: true },
              },
            },
          })
        )
      )
      return created
    })

    return NextResponse.json({
      success: true,
      data: {
        created: workRecords.length,
        skipped: existingStoreIds.size,
        workRecords,
      },
    })
  } catch (error) {
    console.error("템플릿 적용 오류:", error)
    return NextResponse.json(
      { success: false, message: "템플릿 적용 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
