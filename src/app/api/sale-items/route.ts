import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"

// 물품 추가 스키마
const createSaleItemSchema = z.object({
  name: z.string().min(1, "물품명을 입력해주세요"),
  unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다"),
})

/**
 * GET /api/sale-items
 * 물품 목록 조회 (검색 지원)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")

    const saleItems = await prisma.saleItem.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ success: true, data: saleItems })
  } catch (error) {
    console.error("물품 목록 조회 오류:", error)
    return NextResponse.json(
      { success: false, message: "물품 목록 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/sale-items
 * 물품 추가
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()

    // 입력 검증
    const parseResult = createSaleItemSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, unitPrice } = parseResult.data

    // 중복 체크
    const existing = await prisma.saleItem.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, message: "이미 동일한 물품명이 존재합니다" },
        { status: 400 }
      )
    }

    const saleItem = await prisma.saleItem.create({
      data: { name, unitPrice },
    })

    return NextResponse.json({ success: true, data: saleItem }, { status: 201 })
  } catch (error) {
    console.error("물품 추가 오류:", error)
    return NextResponse.json(
      { success: false, message: "물품 추가 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
