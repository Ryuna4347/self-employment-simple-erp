import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const nullableString50Schema = z
  .string()
  .trim()
  .max(50)
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null))

const nullableString200Schema = z
  .string()
  .trim()
  .max(200)
  .optional()
  .nullable()
  .or(z.literal("").transform(() => null))

const updateTaxPartySchema = z
  .object({
    name: z.string().trim().min(1, "사업자명을 입력해주세요").max(100),
    bizNo: z.string().trim().regex(/^\d{10}$/, "사업자등록번호는 10자리 숫자입니다"),
    representativeName: nullableString50Schema,
    businessType: nullableString50Schema,
    businessItem: nullableString50Schema,
    taxInvoiceEmail: z
      .string()
      .trim()
      .email("이메일 형식이 올바르지 않습니다")
      .optional()
      .nullable()
      .or(z.literal("").transform(() => null)),
    address: nullableString200Schema,
  })
  .partial()

const taxPartySelect = {
  id: true,
  name: true,
  bizNo: true,
  representativeName: true,
  businessType: true,
  businessItem: true,
  taxInvoiceEmail: true,
  address: true,
  createdAt: true,
  updatedAt: true,
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const parseResult = updateTaxPartySchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const existing = await prisma.taxParty.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return ApiErrors.notFound("사업자를 찾을 수 없습니다")
    }

    const party = await prisma.taxParty.update({
      where: { id },
      data: parseResult.data,
      select: taxPartySelect,
    })

    return apiSuccess({ party })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return ApiErrors.alreadyExists("이미 등록된 사업자등록번호입니다")
    }

    console.error("[/api/admin/tax-parties/[id]] PUT error:", error)
    return ApiErrors.internalError("사업자 정보 수정 중 오류가 발생했습니다")
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const existing = await prisma.taxParty.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    })
    if (!existing) {
      return ApiErrors.notFound("사업자를 찾을 수 없습니다")
    }

    await prisma.taxParty.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    })

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error("[/api/admin/tax-parties/[id]] DELETE error:", error)
    return ApiErrors.internalError("사업자 삭제 중 오류가 발생했습니다")
  }
}
