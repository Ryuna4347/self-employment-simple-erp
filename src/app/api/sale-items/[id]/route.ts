import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"

// 물품 수정 스키마
const updateSaleItemSchema = z.object({
  name: z.string().min(1, "물품명을 입력해주세요").optional(),
  unitPrice: z.number().int().min(0, "단가는 0 이상이어야 합니다").optional(),
})

/**
 * PATCH /api/sale-items/[id]
 * 물품 수정
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()

    // 입력 검증
    const parseResult = updateSaleItemSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, message: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { name, unitPrice } = parseResult.data

    // 물품 존재 확인
    const existing = await prisma.saleItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "물품을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    // 이름 변경 시 중복 체크
    if (name && name !== existing.name) {
      const duplicate = await prisma.saleItem.findFirst({
        where: {
          name: { equals: name, mode: "insensitive" },
          id: { not: id },
        },
      })

      if (duplicate) {
        return NextResponse.json(
          { success: false, message: "이미 동일한 물품명이 존재합니다" },
          { status: 400 }
        )
      }
    }

    const saleItem = await prisma.saleItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(unitPrice !== undefined && { unitPrice }),
      },
    })

    return NextResponse.json({ success: true, data: saleItem })
  } catch (error) {
    console.error("물품 수정 오류:", error)
    return NextResponse.json(
      { success: false, message: "물품 수정 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/sale-items/[id]
 * 물품 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    // 물품 존재 확인
    const existing = await prisma.saleItem.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "물품을 찾을 수 없습니다" },
        { status: 404 }
      )
    }

    await prisma.saleItem.delete({ where: { id } })

    return NextResponse.json({ success: true, message: "삭제되었습니다" })
  } catch (error) {
    console.error("물품 삭제 오류:", error)
    return NextResponse.json(
      { success: false, message: "물품 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
