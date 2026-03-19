import { NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAdmin, isErrorResponse } from "@/lib/auth-guard"
import { apiSuccess, ApiErrors } from "@/lib/api-response"

// 공지 생성 스키마
const noticeSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요").trim(),
  content: z.string().min(1, "내용을 입력해주세요").trim(),
  expiresAt: z.string().nullable().optional(),
})

export type NoticeFormData = z.infer<typeof noticeSchema>

// 공지 목록 조회 (어드민)
export async function GET() {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
      },
    })

    return apiSuccess(notices)
  } catch (error) {
    console.error("공지 목록 조회 오류:", error)
    return ApiErrors.internalError("공지 목록 조회 중 오류가 발생했습니다")
  }
}

// 공지 생성 (어드민)
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin()
  if (isErrorResponse(authResult)) return authResult

  try {
    const body = await request.json()
    const parseResult = noticeSchema.safeParse(body)

    if (!parseResult.success) {
      return ApiErrors.validationError(parseResult.error.issues[0].message)
    }

    const { title, content, expiresAt } = parseResult.data

    const notice = await prisma.notice.create({
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
        authorId: authResult.user.id,
      },
      include: {
        author: { select: { name: true } },
      },
    })

    return apiSuccess(notice, 201)
  } catch (error) {
    console.error("공지 생성 오류:", error)
    return ApiErrors.internalError("공지 생성 중 오류가 발생했습니다")
  }
}
