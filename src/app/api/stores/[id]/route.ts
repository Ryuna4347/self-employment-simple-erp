import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"

// 매장 수정 스키마
const updateStoreSchema = z.object({
  name: z.string().min(1, "매장명을 입력해주세요").optional(),
  address: z.string().min(1, "주소를 입력해주세요").optional(),
  managerName: z.string().nullable().optional(),
  PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]).optional(),
  kakaoPlaceId: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "품목명을 입력해주세요"),
        unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다"),
        quantity: z.number().int().min(0, "수량은 0 이상이어야 합니다"),
      })
    )
    .optional(),
})

/**
 * GET /api/stores/[id]
 * 매장 상세 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const store = await prisma.store.findUnique({
      where: { id },
      include: { storeItems: true },
    })

    if (!store) {
      return NextResponse.json(
        { success: false, message: "매장을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: store })
  } catch (error) {
    console.error("매장 상세 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "매장 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/stores/[id]
 * 매장 수정 (품목은 deleteMany 후 createMany)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()

    // 입력 검증
    const parseResult = updateStoreSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    // 매장 존재 확인
    const existing = await prisma.store.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "매장을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    const { items, ...storeData } = parseResult.data

    // 트랜잭션으로 매장과 품목 함께 수정
    const store = await prisma.$transaction(async (tx) => {
      // 매장 정보 수정
      await tx.store.update({
        where: { id },
        data: storeData,
      })

      // 품목이 전달되면 기존 품목 삭제 후 새로 생성
      if (items !== undefined) {
        await tx.storeItem.deleteMany({
          where: { storeId: id },
        })

        if (items.length > 0) {
          await tx.storeItem.createMany({
            data: items.map((item) => ({
              storeId: id,
              name: item.name,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
            })),
          })
        }
      }

      // 품목 포함하여 반환
      return tx.store.findUnique({
        where: { id },
        include: { storeItems: true },
      })
    })

    return NextResponse.json({ success: true, data: store })
  } catch (error) {
    console.error("매장 수정 오류:", error)
    return NextResponse.json(
      { success: false, message: "매장 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/stores/[id]
 * 매장 삭제 (Cascade로 StoreItem도 삭제)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    // 매장 존재 확인
    const existing = await prisma.store.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "매장을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    await prisma.store.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "삭제되었습니다" })
  } catch (error) {
    console.error("매장 삭제 오류:", error)
    return NextResponse.json(
      { success: false, message: "매장 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
