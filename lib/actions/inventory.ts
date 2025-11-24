"use server"

import { nanoid } from "nanoid"

import { db } from "@/db"
import { inventory, inventoryLog, pangkalan, product, type Inventory as InventoryRecord, type Pangkalan } from "@/db"
import { and, eq } from "drizzle-orm"

const HARDCODED_PANGKALAN_ID = "pangkalan-2kjqYYJAQ5I_q-6ti14Ta"

async function getActivePangkalan(): Promise<Pangkalan> {
	const pangkalanRecord = await db
		.select()
		.from(pangkalan)
		.where(eq(pangkalan.id, HARDCODED_PANGKALAN_ID))
		.limit(1)

	if (pangkalanRecord.length === 0) {
		throw new Error(`Pangkalan not found with ID: ${HARDCODED_PANGKALAN_ID}`)
	}

	return pangkalanRecord[0]
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

			return {
				stockFilled: newFilled,
				stockEmpty: newEmpty,
				isReturnable,
				warning,
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


