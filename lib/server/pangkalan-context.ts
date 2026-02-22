"use server"

import { cache } from "react"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db, pangkalan, user, type Pangkalan } from "@/db"

const DEFAULT_ROLE: UserRole = "staff"
const DEFAULT_PANGKALAN_ID = process.env.DEFAULT_PANGKALAN_ID

type SessionUser = {
	id: string
	role?: string | null
	defaultPangkalanId?: string | null
	activePangkalanId?: string | null
	metadata?: Record<string, unknown>
}

type UserRole = "admin" | "staff"

export type PangkalanContext = {
	userId: string
	role: UserRole
	pangkalan: Pangkalan
	accessiblePangkalanIds: string[]
}

export type PangkalanContextOptions = {
	pangkalanId?: string | null
}

const getCurrentSession = cache(async () => {
	try {
		const cookieStore = await cookies()
		return await auth.api.getSession({
			headers: {
				cookie: cookieStore.toString(),
			},
		})
	} catch (error) {
		console.error("Session error:", error)
		return null
	}
})

export async function resolvePangkalanContext(options?: PangkalanContextOptions): Promise<PangkalanContext> {
	const session = await getCurrentSession()
	const sessionUser = session?.user as SessionUser | undefined

	if (!sessionUser?.id) {
		throw new Error("Pengguna belum masuk")
	}

	const role = (sessionUser.role as UserRole | undefined) ?? DEFAULT_ROLE
	const requestedId = options?.pangkalanId?.trim() || null

	let accessibleIds: string[] = []

	if (role === "admin") {
		const pangkalanRows = await db.select({ id: pangkalan.id }).from(pangkalan)
		accessibleIds = pangkalanRows.map((row) => row.id)

		if (!accessibleIds.length && DEFAULT_PANGKALAN_ID) {
			accessibleIds = [DEFAULT_PANGKALAN_ID]
		}
	} else {
		const ownedRows = await db
			.select({ id: pangkalan.id })
			.from(pangkalan)
			.where(eq(pangkalan.userId, sessionUser.id))

		if (sessionUser.defaultPangkalanId) {
			ownedRows.push({ id: sessionUser.defaultPangkalanId })
		}

		accessibleIds = ownedRows.map((row) => row.id)
	}

	accessibleIds = Array.from(new Set(accessibleIds.filter(Boolean)))

	const preferenceChain = [requestedId, sessionUser.activePangkalanId, sessionUser.defaultPangkalanId, DEFAULT_PANGKALAN_ID, accessibleIds[0] ?? null]
	const selectedId = preferenceChain.find((id) => id && (role === "admin" || accessibleIds.includes(id))) ?? null

	if (!selectedId) {
		throw new Error("Tidak ada pangkalan yang dapat diakses. Hubungi admin untuk konfigurasi.")
	}

	if (role !== "admin" && accessibleIds.length > 0 && !accessibleIds.includes(selectedId)) {
		throw new Error("Anda tidak memiliki akses ke pangkalan yang dipilih")
	}

	const pangkalanRecord = await db
		.select()
		.from(pangkalan)
		.where(eq(pangkalan.id, selectedId))
		.limit(1)

	if (pangkalanRecord.length === 0) {
		throw new Error("Data pangkalan tidak ditemukan")
	}

	if (sessionUser.activePangkalanId !== selectedId) {
		await db
			.update(user)
			.set({ activePangkalanId: selectedId, updatedAt: new Date() })
			.where(eq(user.id, sessionUser.id))
	}

	return {
		userId: sessionUser.id,
		role,
		pangkalan: pangkalanRecord[0],
		accessiblePangkalanIds: role === "admin" ? accessibleIds : Array.from(new Set(accessibleIds.concat([selectedId]))),
	}
}


