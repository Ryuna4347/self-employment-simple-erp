import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, requireWriteAccess, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const storeInclude = {
  storeItems: true,
  assignedUser: { select: { id: true, name: true } },
}

const storeItemSchema = z.object({
  name: z.string().min(1, "품목명을 입력해주세요"),
  amount: z.number().int().min(0, "금액은 0 이상이어야 합니다"),
  quantity: z.number().int().min(0, "수량은 0 이상이어야 합니다"),
})

const updateStoreSchema = z
  .object({
    name: z.string().min(1, "매장명을 입력해주세요").optional(),
    address: z.string().min(1, "주소를 입력해주세요").optional(),
    managerName: z.string().nullable().optional(),
    PaymentType: z.enum(["CASH", "ACCOUNT", "CARD"]).optional(),
    kakaoPlaceId: z.string().nullable().optional(),
    latitude: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    items: z.array(storeItemSchema).optional(),
    assignedUserId: z.string().nullable().optional(),
    receiptType: z.enum(["NONE", "SIMPLE_RECEIPT", "TRANSACTION_STATEMENT"]).optional(),
    note: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.PaymentType) return true
      return data.PaymentType !== "ACCOUNT" || !!data.managerName?.trim()
    },
    {
      message: "계좌이체 결제 시 입금자를 입력해주세요",
      path: ["managerName"],
    },
  )

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const store = await prisma.store.findFirst({
      where: { id, isDeleted: false },
      include: storeInclude,
    })

    if (!store) {
      return ApiErrors.notFound("매장을 찾을 수 없습니다")
    }

    return apiSuccess(store)
  } catch (error) {
    console.error("[/api/stores/[id]] GET error:", error)
    return ApiErrors.internalError("매장 정보를 불러오지 못했습니다")
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const parseResult = updateStoreSchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const existing = await prisma.store.findFirst({
      where: { id, isDeleted: false },
    })
    if (!existing) {
      return ApiErrors.notFound("매장을 찾을 수 없습니다")
    }

    const { items, ...storeData } = parseResult.data

    const store = await prisma.$transaction(async (tx) => {
      const updatedStore = await tx.store.update({
        where: { id },
        data: storeData,
      })

      await tx.workRecord.updateMany({
        where: { storeId: id },
        data: {
          storeNameSnapshot: updatedStore.name,
          storeAddressSnapshot: updatedStore.address,
        },
      })

      if (items !== undefined) {
        await tx.storeItem.deleteMany({
          where: { storeId: id },
        })

        if (items.length > 0) {
          await tx.storeItem.createMany({
            data: items.map((item) => ({
              storeId: id,
              name: item.name,
              amount: item.amount,
              quantity: item.quantity,
            })),
          })
        }
      }

      return tx.store.findFirst({
        where: { id, isDeleted: false },
        include: storeInclude,
      })
    })

    return apiSuccess(store)
  } catch (error) {
    console.error("[/api/stores/[id]] PUT error:", error)
    return ApiErrors.internalError("매장 수정 중 오류가 발생했습니다")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireWriteAccess()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const existing = await prisma.store.findFirst({
      where: { id, isDeleted: false },
    })
    if (!existing) {
      return ApiErrors.notFound("매장을 찾을 수 없습니다")
    }

    await prisma.store.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error("[/api/stores/[id]] DELETE error:", error)
    return ApiErrors.internalError("매장 삭제 중 오류가 발생했습니다")
  }
}
