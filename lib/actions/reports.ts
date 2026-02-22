'use server'

import { and, desc, eq, gte, lt, sql } from "drizzle-orm"

import { db, capitalEntry, customer, expense, expenseCategory, product, transaction, transactionItem } from "@/db"
import { getBalanceByPangkalanId } from "@/lib/actions/capital"
import { resolvePangkalanContext } from "@/lib/server/pangkalan-context"

type DateRangeInput = {
  from?: string | Date | null
  to?: string | Date | null
}

const toStartOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}

const toEndOfDay = (value: Date) => {
  const date = new Date(value)
  date.setHours(23, 59, 59, 999)
  return date
}

const resolveDateRange = (range?: DateRangeInput) => {
  const now = new Date()
  const rawStart = range?.from ? new Date(range.from) : now
  const rawEnd = range?.to ? new Date(range.to) : rawStart

  let start = toStartOfDay(rawStart)
  let end = toEndOfDay(rawEnd)

  if (end < start) {
    const previousStart = start
    start = toStartOfDay(rawEnd)
    end = toEndOfDay(previousStart)
  }

  const endExclusive = toStartOfDay(new Date(end))
  endExclusive.setDate(endExclusive.getDate() + 1)

  return { start, end, endExclusive }
}

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export async function getReportsAnalytics(range?: DateRangeInput) {
  try {
    const { pangkalan } = await resolvePangkalanContext()
    const { start, end, endExclusive } = resolveDateRange(range)

    const txRows = await db
      .select({
        id: transaction.id,
        totalAmount: transaction.totalAmount,
        totalCost: transaction.totalCost,
        totalProfit: transaction.totalProfit,
        paymentMethod: transaction.paymentMethod,
        status: transaction.status,
        customerName: customer.name,
        createdAt: transaction.createdAt,
      })
      .from(transaction)
      .leftJoin(customer, eq(transaction.customerId, customer.id))
      .where(
        and(
          eq(transaction.pangkalanId, pangkalan.id),
          eq(transaction.status, "paid"),
          gte(transaction.createdAt, start),
          lt(transaction.createdAt, endExclusive),
        ),
      )
      .orderBy(desc(transaction.createdAt))

    const itemRows = await db
      .select({
        transactionId: transactionItem.transactionId,
        productId: transactionItem.productId,
        productName: product.name,
        productCategory: product.category,
        qty: transactionItem.qty,
        subtotal: transactionItem.subtotal,
        costAtPurchase: transactionItem.costAtPurchase,
        profit: transactionItem.profit,
        createdAt: transaction.createdAt,
      })
      .from(transactionItem)
      .innerJoin(transaction, eq(transactionItem.transactionId, transaction.id))
      .innerJoin(product, eq(transactionItem.productId, product.id))
      .where(
        and(
          eq(transaction.pangkalanId, pangkalan.id),
          eq(transaction.status, "paid"),
          gte(transaction.createdAt, start),
          lt(transaction.createdAt, endExclusive),
        ),
      )
      .orderBy(desc(transaction.createdAt))

    const itemCountByTx = itemRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.transactionId] = (acc[row.transactionId] ?? 0) + (row.qty ?? 0)
      return acc
    }, {})

    const expenses = await db
      .select({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        categoryId: expense.categoryId,
        categoryName: expenseCategory.name,
        categoryColor: expenseCategory.color,
        expenseDate: expense.expenseDate,
      })
      .from(expense)
      .innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
      .where(
        and(
          eq(expense.pangkalanId, pangkalan.id),
          gte(expense.expenseDate, start),
          lt(expense.expenseDate, endExclusive),
        ),
      )
      .orderBy(desc(expense.expenseDate))

    const capitalRows = await db
      .select({
        id: capitalEntry.id,
        type: capitalEntry.type,
        amount: capitalEntry.amount,
        note: capitalEntry.note,
        createdAt: capitalEntry.createdAt,
      })
      .from(capitalEntry)
      .where(
        and(
          eq(capitalEntry.pangkalanId, pangkalan.id),
          gte(capitalEntry.createdAt, start),
          lt(capitalEntry.createdAt, endExclusive),
        ),
      )
      .orderBy(capitalEntry.createdAt)

    const openingCapitalSummary = await db
      .select({
        totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'in' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
        totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'out' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
      })
      .from(capitalEntry)
      .where(
        and(
          eq(capitalEntry.pangkalanId, pangkalan.id),
          lt(capitalEntry.createdAt, start),
        ),
      )

    const openingBalance =
      toNumber(openingCapitalSummary[0]?.totalIn) - toNumber(openingCapitalSummary[0]?.totalOut)

    const currentCapital = await getBalanceByPangkalanId(pangkalan.id)

    return {
      success: true,
      data: {
        pangkalanId: pangkalan.id,
        pangkalanName: pangkalan.name,
        range: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
        openingCapitalBalance: openingBalance,
        currentCapitalBalance: currentCapital.balance,
        transactions: txRows.map((row) => ({
          id: row.id,
          totalAmount: toNumber(row.totalAmount),
          totalCost: toNumber(row.totalCost),
          totalProfit: toNumber(row.totalProfit),
          paymentMethod: row.paymentMethod,
          status: row.status,
          customerName: row.customerName,
          createdAt: row.createdAt.toISOString(),
          itemCount: itemCountByTx[row.id] ?? 0,
        })),
        itemSales: itemRows.map((row) => ({
          transactionId: row.transactionId,
          productId: row.productId,
          productName: row.productName,
          productCategory: row.productCategory,
          qty: row.qty ?? 0,
          subtotal: toNumber(row.subtotal),
          costAtPurchase: toNumber(row.costAtPurchase),
          profit: toNumber(row.profit),
          createdAt: row.createdAt.toISOString(),
        })),
        expenses: expenses.map((row) => ({
          id: row.id,
          description: row.description,
          amount: toNumber(row.amount),
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categoryColor: row.categoryColor || "#94a3b8",
          expenseDate: row.expenseDate.toISOString(),
        })),
        capitalEntries: capitalRows.map((row) => ({
          id: row.id,
          type: row.type as "in" | "out",
          amount: toNumber(row.amount),
          note: row.note,
          createdAt: row.createdAt.toISOString(),
        })),
      },
    }
  } catch (error) {
    console.error("Error fetching report analytics:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat data analitik laporan",
      data: null,
    }
  }
}
