"use server"

import { nanoid } from "nanoid"

import { db } from "@/db"
import { capitalEntry, inventory, inventoryLog, priceRule, product, type Inventory as InventoryRecord, type Pangkalan } from "@/db"
import { and, eq } from "drizzle-orm"
import { resolvePangkalanContext } from "@/lib/server/pangkalan-context"
import { ensureSufficientCapitalBalance } from "@/lib/actions/capital"

async function getActivePangkalan(): Promise<Pangkalan> {
	const { pangkalan } = await resolvePangkalanContext()
	return pangkalan
}

type RestockPayload = {
	productId: string
	quantity: number
	note?: string
}

type RestockResponse = {
	success: boolean
	data?: {
		productId: string
		stockFilled: number
		stockEmpty: number
		isReturnable: boolean
		warning?: string
		warningCapital?: string
	}
	error?: string
}

function normalizeQuantity(value: number) {
	const numeric = Number(value)
	if (!Number.isFinite(numeric) || numeric <= 0) {
		throw new Error("Jumlah restock harus lebih dari 0")
	}
	return Math.floor(numeric)
}

function mapInventoryNumber(field?: number | null) {
	if (typeof field === "number") return field
	const numeric = Number(field ?? 0)
	return Number.isFinite(numeric) ? numeric : 0
}

export async function restockProductForCurrentPangkalan(payload: RestockPayload): Promise<RestockResponse> {
	try {
		const quantity = normalizeQuantity(payload.quantity)
		const currentPangkalan = await getActivePangkalan()

		const productRecord = await db
			.select({
				id: product.id,
				pangkalanId: product.pangkalanId,
				isGlobal: product.isGlobal,
				name: product.name,
				category: product.category,
			})
			.from(product)
			.where(eq(product.id, payload.productId))
			.limit(1)

		if (productRecord.length === 0) {
			return { success: false, error: "Produk tidak ditemukan" }
		}

		const targetProduct = productRecord[0]
		const isReturnable = targetProduct.category === "gas" || targetProduct.category === "water"
		if (!targetProduct.isGlobal && targetProduct.pangkalanId !== currentPangkalan.id) {
			return { success: false, error: "Produk tidak dimiliki oleh pangkalan ini" }
		}

		const now = new Date()
		const pricingRecord = await db
			.select({
				basePrice: priceRule.basePrice,
				costPrice: priceRule.costPrice,
			})
			.from(priceRule)
			.where(
				and(
					eq(priceRule.productId, payload.productId),
					eq(priceRule.pangkalanId, currentPangkalan.id)
				)
			)
			.limit(1)

		const costPrice = Number(pricingRecord[0]?.costPrice ?? 0)
		const basePrice = Number(pricingRecord[0]?.basePrice ?? 0)
		const unitCapitalCost = costPrice > 0 ? costPrice : Math.max(0, basePrice)
		const totalCapitalOut = Number((unitCapitalCost * quantity).toFixed(2))

		if (totalCapitalOut > 0) {
			await ensureSufficientCapitalBalance(currentPangkalan.id, totalCapitalOut)
		}

		const result = await db.transaction(async (tx) => {
			const inventoryRows = await tx
				.select()
				.from(inventory)
				.where(
					and(
						eq(inventory.productId, payload.productId),
						eq(inventory.pangkalanId, currentPangkalan.id)
					)
				)
				.limit(1)

			const currentInventory: InventoryRecord | null = inventoryRows.length > 0 ? inventoryRows[0] : null

			const currentFilled = mapInventoryNumber(currentInventory?.stockFilled)
			const currentEmpty = mapInventoryNumber(currentInventory?.stockEmpty)

			const newFilled = currentFilled + quantity
			const emptyReduction = isReturnable ? Math.min(quantity, currentEmpty) : 0
			const newEmpty = isReturnable ? Math.max(0, currentEmpty - quantity) : currentEmpty
			const warning = isReturnable && quantity > currentEmpty
				? "Stok tabung kosong kurang dari jumlah restock. Sisa stok kosong diset ke 0."
				: undefined

			if (currentInventory) {
				await tx
					.update(inventory)
					.set({
						stockFilled: newFilled,
						stockEmpty: newEmpty,
						updatedAt: now,
					})
					.where(eq(inventory.id, currentInventory.id))
			} else {
				await tx.insert(inventory).values({
					id: nanoid(),
					pangkalanId: currentPangkalan.id,
					productId: payload.productId,
					stockFilled: newFilled,
					stockEmpty: newEmpty,
					updatedAt: now,
				})
			}

			await tx.insert(inventoryLog).values({
				id: nanoid(),
				pangkalanId: currentPangkalan.id,
				productId: payload.productId,
				qtyChangeFilled: quantity,
				qtyChangeEmpty: isReturnable ? -emptyReduction : 0,
				type: "manual_restock",
				note:
					payload.note?.trim() ||
					`Restock manual ${quantity} unit untuk ${targetProduct.name}`,
				createdAt: now,
			})

			if (totalCapitalOut > 0) {
				await tx.insert(capitalEntry).values({
					id: nanoid(),
					pangkalanId: currentPangkalan.id,
					type: "out",
					amount: totalCapitalOut.toFixed(2),
					note: `AUTO:RESTOCK:${targetProduct.name} x${quantity}`,
					createdAt: now,
				})
			}

			return {
				stockFilled: newFilled,
				stockEmpty: newEmpty,
				isReturnable,
				warning,
				totalCapitalOut,
			}
		})

		return {
			success: true,
			data: {
				productId: payload.productId,
				stockFilled: result.stockFilled,
				stockEmpty: result.stockEmpty,
				isReturnable: result.isReturnable,
				warning: result.warning,
				warningCapital:
					totalCapitalOut === 0
						? "Biaya modal restock belum tercatat karena harga modal produk masih 0."
						: undefined,
			},
		}
	} catch (error) {
		console.error("Error during manual restock:", error)
		return {
			success: false,
			error: error instanceof Error ? error.message : "Gagal melakukan restock",
		}
	}
}
