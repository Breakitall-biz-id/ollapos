'use client'

import { useEffect, useState } from "react"
import {
  Tag,
} from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingState } from "@/components/page-loading-state"
import { TablePageHeader } from "@/components/table-page-header"
import { SetupRequiredBanner } from "@/components/setup-required-banner"
import {
  getExpenseCategories,
  initializeDefaultExpenseCategories,
  type ExpenseCategoryItem
} from "@/lib/actions/expenses"
import { getExpenseCategoryPresentation } from "@/lib/expense-category-presentation"

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await getExpenseCategories()
      if (result.success) {
        setCategories(result.data)
      }
    } catch (error) {
      console.error("Error loading expense categories:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const handleInitializeDefaults = async () => {
    setIsInitializing(true)
    try {
      const result = await initializeDefaultExpenseCategories()
      if (!result.success) {
        throw new Error(result.error || "Gagal menginisialisasi kategori")
      }
      toast.success("Kategori default berhasil diinisialisasi")
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menginisialisasi kategori")
    } finally {
      setIsInitializing(false)
    }
  }

  if (loading) {
    return <PageLoadingState title="Memuat kategori pengeluaran" />
  }

  return (
    <div className="table-page simple-page">
      <TablePageHeader
        title="Kategori Pengeluaran"
        subtitle="Kategori default untuk mengelompokkan pengeluaran bisnis Anda."
        rightContent={
          <Badge className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
            {categories.length} Kategori
          </Badge>
        }
      />
      <Card className="table-list-card table-list-card-standalone">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl font-semibold text-primary">Daftar Kategori</CardTitle>
          <p className="text-sm text-secondary">Kategori aktif untuk pencatatan pengeluaran.</p>
        </CardHeader>
        <CardContent className="table-list-card-body">
          {categories.length === 0 ? (
            <SetupRequiredBanner
              className="rounded-[24px] border border-warning/50 bg-warning-subtle p-6 text-warning"
              title="Kategori belum tersedia"
              description="Data kategori pengeluaran belum ada. Inisialisasi kategori default agar modul pengeluaran bisa dipakai."
              actionLabel="Inisialisasi Kategori Default"
              actionInProgressLabel="Menginisialisasi..."
              isLoading={isInitializing}
              onAction={handleInitializeDefaults}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => {
                const { Icon, color, name } = getExpenseCategoryPresentation(category)
                return (
                  <Card key={category.id} className="rounded-2xl border border-medium/60 bg-white">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                          style={{ backgroundColor: color }}
                        >
                          <Icon className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-primary">{name}</CardTitle>
                          <p className="text-sm text-secondary">{category.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-xs font-medium text-primary">{category.icon}</span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="table-list-card table-list-card-standalone">
        <CardContent className="table-list-card-body p-6">
          <div className="text-center">
            <Tag className="mx-auto mb-4 h-10 w-10 text-primary opacity-45" aria-hidden />
            <p className="text-sm text-secondary">
              Kategori default ini membantu pengelompokan pengeluaran agar laporan lebih rapi.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
