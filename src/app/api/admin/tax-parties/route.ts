import { NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdmin, requireAdminRead, isErrorResponse } from "@/lib/auth-guard"
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

const taxPartySchema = z.object({
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

export async function GET(request: NextRequest) {
  const authResult = await requireAdminRead()
  if (isErrorResponse(authResult)) return authResult

  try {
    const search = request.nextUrl.searchParams.get("search")?.trim()

    const parties = await prisma.taxParty.findMany({
      where: {
        isDeleted: false,
        ...(search && {
          OR: [
            { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { bizNo: { contains: search } },
          ],
        }),
      },
      orderBy: [{ name: "asc" }],
      select: taxPartySelect,
    })

    return apiSuccess({ parties })
  } catch (error) {
    console.error("[/api/admin/tax-parties] GET error:", error)
    return ApiErrors.internalError("사업자 목록을 불러오지 못했습니다")
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = taxPartySchema.safeParse(body)

    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]
      return ApiErrors.validationError(firstError.message, [
        { field: firstError.path.join("."), message: firstError.message },
      ])
    }

    const party = await prisma.taxParty.create({
      data: parseResult.data,
      select: taxPartySelect,
    })

    return apiSuccess({ party }, 201)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return ApiErrors.alreadyExists("이미 등록된 사업자등록번호입니다")
    }

    console.error("[/api/admin/tax-parties] POST error:", error)
    return ApiErrors.internalError("사업자 등록 중 오류가 발생했습니다")
  }
}
