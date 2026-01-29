import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

// 매장 생성 스키마
const createStoreSchema = z.object({
  name: z.string().min(1, "매장명을 입력해주세요"),
  address: z.string().min(1, "주소를 입력해주세요"),
  managerName: z.string().optional(),
  PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]),
  kakaoPlaceId: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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
 * GET /api/stores
 * 매장 목록 조회 (검색 지원)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    const stores = await prisma.store.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { address: { contains: search, mode: "insensitive" } },
              { managerName: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        storeItems: true,
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: stores })
  } catch (error) {
    console.error("매장 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "매장 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/stores
 * 매장 추가 (품목과 함께 트랜잭션 처리)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 입력 검증
    const parseResult = createStoreSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { items, ...storeData } = parseResult.data

    // 트랜잭션으로 매장과 품목 함께 생성
    const store = await prisma.$transaction(async (tx) => {
      const newStore = await tx.store.create({
        data: storeData,
      })

      // 품목이 있으면 함께 생성
      if (items && items.length > 0) {
        await tx.storeItem.createMany({
          data: items.map((item) => ({
            storeId: newStore.id,
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        })
      }

      // 품목 포함하여 반환
      return tx.store.findUnique({
        where: { id: newStore.id },
        include: { storeItems: true },
      })
    })

    return NextResponse.json({ success: true, data: store }, { status: 201 })
  } catch (error) {
    console.error("매장 추가 오류:", error)
    return NextResponse.json(
      { success: false, message: "매장 추가 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
