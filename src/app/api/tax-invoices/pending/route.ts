import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireApiKey } from "@/lib/auth-guard"
import { startOfMonthKST, endOfMonthKST, toKSTDateString } from "@/lib/date-utils"
import { splitVat, formatDecimalString } from "@/lib/tax-invoice-utils"

const NO_STORE_HEADERS = { "Cache-Control": "no-store" }

const querySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

function externalJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS })
}

export async function GET(request: NextRequest) {
  const authError = requireApiKey(request)
  if (authError) return authError

  const parseResult = querySchema.safeParse({
    year: request.nextUrl.searchParams.get("year"),
    month: request.nextUrl.searchParams.get("month"),
  })

  if (!parseResult.success) {
    return externalJson({ error: "invalid_query" }, 400)
  }

  const { year, month } = parseResult.data

  try {
    const periodStart = startOfMonthKST(year, month)
    const periodEnd = endOfMonthKST(year, month)
    const issueDate = toKSTDateString(new Date())
    const monthLabel = `${month}월 정산금`

    const stores = await prisma.store.findMany({
      where: {
        isDeleted: false,
        taxInvoiceEnabled: true,
        PaymentType: { in: ["CASH", "ACCOUNT"] },
        bizNo: { not: null },
      },
      select: {
        id: true,
        name: true,
        managerName: true,
        PaymentType: true,
        bizNo: true,
      },
    })

    const storesWithBizNo = stores
      .map((store) => ({ ...store, bizNo: store.bizNo?.trim() ?? "" }))
      .filter((store) => store.bizNo.length > 0)

    if (storesWithBizNo.length === 0) {
      return externalJson({ year, month, stores: [] })
    }

    const records = await prisma.workRecord.findMany({
      where: {
        storeId: { in: storesWithBizNo.map((store) => store.id) },
        date: { gte: periodStart, lte: periodEnd },
      },
      select: {
        storeId: true,
        items: { select: { amount: true } },
      },
    })

    const totalByStore = new Map<string, number>()
    for (const record of records) {
      if (!record.storeId) continue
      const recordTotal = record.items.reduce((sum, item) => sum + item.amount, 0)
      totalByStore.set(record.storeId, (totalByStore.get(record.storeId) ?? 0) + recordTotal)
    }

    const monthPad = String(month).padStart(2, "0")
    const responseStores = []

    for (const store of storesWithBizNo) {
      const totalAmount = totalByStore.get(store.id) ?? 0
      if (totalAmount <= 0) continue

      const { supply, tax } = splitVat(totalAmount)
      responseStores.push({
        store_id: store.id,
        biz_no: store.bizNo,
        store_name: store.name,
        manager_name: store.managerName ?? "",
        payment_type: store.PaymentType,
        issue_date: issueDate,
        bill_type: "청구",
        supply_amount: formatDecimalString(supply),
        tax_amount: formatDecimalString(tax),
        total_amount: formatDecimalString(totalAmount),
        idempotency_key: `${store.id}-${year}-${monthPad}`,
        items: [
          {
            name: monthLabel,
            spec: "",
            qty: null,
            unit_price: null,
            supply_amount: formatDecimalString(supply),
            tax_amount: formatDecimalString(tax),
            note: "",
          },
        ],
      })
    }

    return externalJson({ year, month, stores: responseStores })
  } catch (error) {
    console.error("[/api/tax-invoices/pending] GET error:", error)
    return externalJson({ error: "internal_error" }, 500)
  }
}
