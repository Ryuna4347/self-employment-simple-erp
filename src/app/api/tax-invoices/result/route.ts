import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireApiKey } from "@/lib/auth-guard"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const bodySchema = z.object({
  store_id: z.string().min(1),
  idempotency_key: z.string().min(1),
  status: z.enum(["submitted", "skipped", "failed"]),
  mode: z.string().min(1),
  submitted_at: z.string().datetime({ offset: true }),
  retry_count: z.number().int().min(0),
  error_reason: z.string().nullable(),
})

const STATUS_MAP = {
  submitted: "SUBMITTED",
  skipped: "SKIPPED",
  failed: "FAILED",
} as const

function externalJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

function parseIdempotencyKey(idempotencyKey: string) {
  const parts = idempotencyKey.split("-")
  if (parts.length < 3) return null

  const month = Number(parts[parts.length - 1])
  const year = Number(parts[parts.length - 2])
  const storeId = parts.slice(0, -2).join("-")

  if (
    !storeId ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    year < 2020 ||
    year > 2100 ||
    month < 1 ||
    month > 12
  ) {
    return null
  }

  return { storeId, year, month }
}

export async function PUT(request: NextRequest) {
  const authError = requireApiKey(request)
  if (authError) return authError

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return externalJson({ error: "invalid_body" }, 400)
  }

  const parseResult = bodySchema.safeParse(body)
  if (!parseResult.success) {
    return externalJson({ error: "invalid_body" }, 400)
  }

  const {
    store_id: storeId,
    idempotency_key: idempotencyKey,
    status,
    mode,
    submitted_at: submittedAt,
    retry_count: retryCount,
    error_reason: errorReason,
  } = parseResult.data

  const parsedKey = parseIdempotencyKey(idempotencyKey)
  if (!parsedKey || parsedKey.storeId !== storeId) {
    return externalJson({ error: "invalid_body" }, 400)
  }

  try {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    })

    if (!store) {
      return externalJson({ error: "invalid_body" }, 400)
    }

    await prisma.taxInvoiceResult.upsert({
      where: { idempotencyKey },
      create: {
        storeId,
        year: parsedKey.year,
        month: parsedKey.month,
        idempotencyKey,
        status: STATUS_MAP[status],
        mode,
        submittedAt: new Date(submittedAt),
        retryCount,
        errorReason,
      },
      update: {
        status: STATUS_MAP[status],
        mode,
        submittedAt: new Date(submittedAt),
        retryCount,
        errorReason,
      },
    })

    return externalJson({ ok: true })
  } catch (error) {
    console.error("[/api/tax-invoices/result] PUT error:", error)
    return externalJson({ error: "internal_error" }, 500)
  }
}
