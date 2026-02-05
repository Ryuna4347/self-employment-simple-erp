import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

interface RouteParams {
  params: Promise<{ id: string }>
}

// 직접 입력한 매장 정보를 Store DB에 저장
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (isErrorResponse(authResult)) return authResult

  const { user } = authResult
  const { id } = await params

  // 근무기록 조회
  const workRecord = await prisma.workRecord.findUnique({
    where: { id },
    include: {
      items: { select: { name: true, unitPrice: true, quantity: true } },
    },
  })

  if (!workRecord) {
    return ApiErrors.notFound("근무기록을 찾을 수 없습니다")
  }

  // 권한 확인 (본인 또는 ADMIN)
  if (workRecord.userId !== user.id && user.role !== "ADMIN") {
    return ApiErrors.forbidden("이 근무기록을 수정할 권한이 없습니다")
  }

  // 이미 매장이 연결되어 있는지 확인
  if (workRecord.storeId) {
    return ApiErrors.validationError("이미 매장이 연결되어 있습니다")
  }

  // 스냅샷 필드 확인
  if (!workRecord.storeNameSnapshot) {
    return ApiErrors.validationError("매장명 정보가 없습니다")
  }

  // 트랜잭션으로 Store 생성 + WorkRecord 업데이트
  const result = await prisma.$transaction(async (tx) => {
    // Store 생성
    const store = await tx.store.create({
      data: {
        name: workRecord.storeNameSnapshot!,
        address: workRecord.storeAddressSnapshot || "",
        managerName: workRecord.managerNameSnapshot,
        PaymentType: workRecord.paymentTypeSnapshot,
        // 근무기록의 품목을 StoreItem으로 복사
        storeItems: {
          create: workRecord.items.map((item) => ({
            name: item.name,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        storeItems: true,
      },
    })

    // WorkRecord의 storeId 업데이트
    const updatedWorkRecord = await tx.workRecord.update({
      where: { id },
      data: { storeId: store.id },
      include: {
        store: { select: { id: true, name: true, address: true, managerName: true } },
        items: { select: { id: true, name: true, unitPrice: true, quantity: true } },
        user: { select: { id: true, name: true } },
      },
    })

    return { store, workRecord: updatedWorkRecord }
  })

  return apiSuccess(result, 201)
}
