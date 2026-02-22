"use server"

import { inArray } from "drizzle-orm"

import { db, pangkalan } from "@/db"
import { resolvePangkalanContext } from "@/lib/server/pangkalan-context"

export async function getPangkalanSettings() {
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
        address: pangkalan.address,
        phone: pangkalan.phone,
      })
      .from(pangkalan)
      .where(inArray(pangkalan.id, accessibleIds))

    const pangkalanList = rows.sort((a, b) => a.name.localeCompare(b.name, "id-ID"))

    return {
      success: true,
      data: {
        activePangkalanId: context.pangkalan.id,
        role: context.role,
        pangkalanList,
      },
    }
  } catch (error) {
    console.error("Error getting pangkalan settings:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal memuat pengaturan pangkalan",
      data: null,
    }
  }
}

export async function setActivePangkalan(pangkalanId: string) {
  try {
    const targetId = pangkalanId?.trim()
    if (!targetId) {
      return { success: false, error: "Pangkalan wajib dipilih." }
    }

    const context = await resolvePangkalanContext({ pangkalanId: targetId })

    return {
      success: true,
      data: {
        id: context.pangkalan.id,
        name: context.pangkalan.name,
      },
    }
  } catch (error) {
    console.error("Error setting active pangkalan:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengganti pangkalan aktif",
    }
  }
}
