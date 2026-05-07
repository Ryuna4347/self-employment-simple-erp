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

type ItemGroup = {
  name: string
  amount: number
  quantity: number
}

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

    const stores = await prisma.store.findMany({
      where: {
        isDeleted: false,
        taxInvoiceEnabled: true,
        PaymentType: { in: ["CASH", "ACCOUNT"] },
        taxPartyId: { not: null },
        taxParty: { is: { isDeleted: false } },
      },
      select: {
        id: true,
        name: true,
        managerName: true,
        PaymentType: true,
        taxParty: { select: { bizNo: true } },
      },
    })

    const storesWithBizNo = stores
      .map((store) => ({ ...store, bizNo: store.taxParty?.bizNo.trim() ?? "" }))
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
        items: { select: { name: true, amount: true, quantity: true } },
      },
    })

    const groupsByStore = new Map<string, Map<string, { amount: number; quantity: number }>>()
    for (const record of records) {
      if (!record.storeId) continue

      const groups = groupsByStore.get(record.storeId) ?? new Map<string, { amount: number; quantity: number }>()
      for (const item of record.items) {
        const current = groups.get(item.name) ?? { amount: 0, quantity: 0 }
        current.amount += item.amount
        current.quantity += item.quantity
        groups.set(item.name, current)
      }
      groupsByStore.set(record.storeId, groups)
    }

    const monthPad = String(month).padStart(2, "0")
    const responseStores = []

    for (const store of storesWithBizNo) {
      const storeGroups = groupsByStore.get(store.id)
      if (!storeGroups) continue

      const allGroups = Array.from(storeGroups.entries()).map(([name, group]) => ({
        name,
        amount: group.amount,
        quantity: group.quantity,
      }))
      const totalAmount = allGroups.reduce((sum, group) => sum + group.amount, 0)
      if (totalAmount <= 0) continue

      const itemGroups = allGroups
        .filter((group) => group.amount > 0)
        .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name))
      if (itemGroups.length === 0) continue

      const { supply, tax } = splitVat(totalAmount)
      const responseItems = itemGroups.map((group: ItemGroup) => {
        const { supply: lineSupply, tax: lineTax } = splitVat(group.amount)
        return {
          name: group.name,
          spec: "",
          qty: group.quantity > 0 ? group.quantity : null,
          unit_price:
            group.quantity > 0 && group.amount % group.quantity === 0
              ? group.amount / group.quantity
              : null,
          supply_amount: formatDecimalString(lineSupply),
          tax_amount: formatDecimalString(lineTax),
          note: "",
        }
      })

      const lineSupplyTotal = responseItems.reduce((sum, item) => sum + Number(item.supply_amount), 0)
      const lineTaxTotal = responseItems.reduce((sum, item) => sum + Number(item.tax_amount), 0)
      const anchorItem = responseItems[0]
      anchorItem.supply_amount = formatDecimalString(Number(anchorItem.supply_amount) + supply - lineSupplyTotal)
      anchorItem.tax_amount = formatDecimalString(Number(anchorItem.tax_amount) + tax - lineTaxTotal)

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
        items: responseItems,
      })
    }

    return externalJson({ year, month, stores: responseStores })
  } catch (error) {
    console.error("[/api/tax-invoices/pending] GET error:", error)
    return externalJson({ error: "internal_error" }, 500)
  }
}
