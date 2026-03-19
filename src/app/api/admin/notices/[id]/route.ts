import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

const noticeUpdateSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  content: z.string().min(1, "내용을 입력해주세요").trim(),
  expiresAt: z.string().nullable().optional(),
})

// 공지 수정 (어드민)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params
    const body = await request.json()
    const parseResult = noticeUpdateSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const existing = await prisma.notice.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("공지를 찾을 수 없습니다")
    }

    const { title, content, expiresAt } = parseResult.data

    const notice = await prisma.notice.update({
      where: { id },
      data: {
        title,
        content,
        expiresAt: expiresAt
          ? (() => {
              const d = new Date(expiresAt)
              d.setHours(23, 59, 59, 999)
              return d
            })()
          : null,
      },
      include: {
        author: { select: { name: true } },
      },
    })

    return apiSuccess(notice)
  } catch (error) {
    console.error("공지 수정 오류:", error)
    return ApiErrors.internalError("공지 수정 중 오류가 발생했습니다")
  }
}

// 공지 삭제 (어드민)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const { id } = await params

    const existing = await prisma.notice.findUnique({ where: { id } })
    if (!existing) {
      return ApiErrors.notFound("공지를 찾을 수 없습니다")
    }

    await prisma.notice.delete({ where: { id } })

    return apiSuccess({ id })
  } catch (error) {
    console.error("공지 삭제 오류:", error)
    return ApiErrors.internalError("공지 삭제 중 오류가 발생했습니다")
  }
}
