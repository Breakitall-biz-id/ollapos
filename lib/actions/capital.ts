"use server"

import { eq, inArray, sql } from "drizzle-orm"
import { nanoid } from "nanoid"

import { db, capitalEntry, pangkalan } from "@/db"
import { resolvePangkalanContext } from "@/lib/server/pangkalan-context"

type CapitalType = "in" | "out"

type CreateCapitalEntryInput = {
  pangkalanId?: string | null
  type: CapitalType
  amount: number
  note?: string | null
}

const toNumber = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) return 0
  const numeric = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export async function getBalanceByPangkalanId(pangkalanId: string) {
  const summary = await db
    .select({
      totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'in' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
      totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'out' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
    })
    .from(capitalEntry)
    .where(eq(capitalEntry.pangkalanId, pangkalanId))

  const totalIn = toNumber(summary[0]?.totalIn)
  const totalOut = toNumber(summary[0]?.totalOut)

  return {
    totalIn,
    totalOut,
    balance: totalIn - totalOut,
  }
}

export async function ensureSufficientCapitalBalance(pangkalanId: string, amount: number) {
  const current = await getBalanceByPangkalanId(pangkalanId)
  if (amount > current.balance) {
    throw new Error(`Saldo modal tidak cukup. Saldo saat ini Rp ${Math.round(current.balance).toLocaleString("id-ID")}.`)
  }
  return current
}

export async function getPangkalanCapitalBalances() {
  try {
    const context = await resolvePangkalanContext()
    const accessibleIds = context.accessiblePangkalanIds

    if (!accessibleIds.length) {
      return {
        success: false,
        error: "Tidak ada pangkalan yang bisa diakses.",
        data: null,
      }
    }

    const rows = await db
      .select({
        id: pangkalan.id,
        name: pangkalan.name,
      })
      .from(pangkalan)
      .where(inArray(pangkalan.id, accessibleIds))

    const grouped = await db
      .select({
        pangkalanId: capitalEntry.pangkalanId,
        totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'in' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
        totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${capitalEntry.type} = 'out' THEN ${capitalEntry.amount} ELSE 0 END), 0)`,
      })
      .from(capitalEntry)
      .where(inArray(capitalEntry.pangkalanId, accessibleIds))
      .groupBy(capitalEntry.pangkalanId)

    const summaryMap = new Map(
      grouped.map((item) => [
        item.pangkalanId,
        {
          totalIn: toNumber(item.totalIn),
          totalOut: toNumber(item.totalOut),
        },
      ])
    )

    const capitalList = rows
      .map((item) => {
        const summary = summaryMap.get(item.id) ?? { totalIn: 0, totalOut: 0 }
        return {
          pangkalanId: item.id,
          pangkalanName: item.name,
          totalIn: summary.totalIn,
          totalOut: summary.totalOut,
          balance: summary.totalIn - summary.totalOut,
        }
      })
      .sort((a, b) => a.pangkalanName.localeCompare(b.pangkalanName, "id-ID"))

    return {
      success: true,
      data: {
        activePangkalanId: context.pangkalan.id,
        capitalList,
      },
    }
  } catch (error) {
    console.error("Error getting capital balances:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat saldo modal",
      data: null,
    }
  }
}

export async function getActivePangkalanCapitalBalance() {
  try {
    const context = await resolvePangkalanContext()
    const summary = await getBalanceByPangkalanId(context.pangkalan.id)

    return {
      success: true,
      data: {
        pangkalanId: context.pangkalan.id,
        pangkalanName: context.pangkalan.name,
        ...summary,
      },
    }
  } catch (error) {
    console.error("Error getting active capital balance:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat saldo modal aktif",
      data: {
        pangkalanId: "",
        pangkalanName: "",
        totalIn: 0,
        totalOut: 0,
        balance: 0,
      },
    }
  }
}

export async function createCapitalEntry(input: CreateCapitalEntryInput) {
  try {
    const type = input.type
    if (type !== "in" && type !== "out") {
      return { success: false, error: "Tipe modal tidak valid." }
    }

    const amount = Number(input.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Nominal modal harus lebih dari 0." }
    }

    const context = await resolvePangkalanContext({
      pangkalanId: input.pangkalanId ?? null,
    })

    const currentBalance = await getBalanceByPangkalanId(context.pangkalan.id)
    if (type === "out" && amount > currentBalance.balance) {
      return {
        success: false,
        error: `Modal keluar melebihi saldo. Saldo saat ini Rp ${Math.round(currentBalance.balance).toLocaleString("id-ID")}.`,
      }
    }

    await db.insert(capitalEntry).values({
      id: nanoid(),
      pangkalanId: context.pangkalan.id,
      type,
      amount: amount.toFixed(2),
      note: input.note?.trim() || null,
      createdAt: new Date(),
    })

    const updated = await getBalanceByPangkalanId(context.pangkalan.id)

    return {
      success: true,
      data: {
        pangkalanId: context.pangkalan.id,
        pangkalanName: context.pangkalan.name,
        balance: updated.balance,
      },
    }
  } catch (error) {
    console.error("Error creating capital entry:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal menyimpan modal",
    }
  }
}
