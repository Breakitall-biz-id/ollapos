'use client'

import { useEffect, useState } from "react"
import {
  Tag,
  Settings,
  Zap,
  Wrench,
  Users,
  Megaphone,
  Package,
  Home,
  FileText,
  MoreHorizontal,
  Loader2,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getExpenseCategories, type ExpenseCategoryItem } from "@/lib/actions/expenses"

const iconMap: Record<string, any> = {
  Settings,
  Zap,
  Wrench,
  Users,
  Megaphone,
  Package,
  Home,
  FileText,
  MoreHorizontal,
  Tag,
}

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([])
  const [loading, setLoading] = useState(true)

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
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" aria-hidden />
          <h2 className="text-2xl font-semibold text-primary">Memuat Kategori</h2>
          <p className="text-secondary">Mohon tunggu sesaat…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white to-[#F2F4FF] p-6 shadow-[0_40px_120px_-80px_rgba(15,23,42,0.8)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">Keuangan</p>
              <h1 className="text-3xl font-semibold leading-tight text-primary lg:text-4xl">Kategori Pengeluaran</h1>
              <p className="text-sm text-secondary">Kategori default untuk mengelompokkan pengeluaran bisnis Anda</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {categories.length} Kategori
              </Badge>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const IconComponent = iconMap[category.icon] || Tag
            return (
              <Card key={category.id} className="rounded-[24px] border border-white/60 bg-gradient-to-br from-white via-white to-[#F2F4FF] shadow-[0_20px_60px_-30px_rgba(15,23,42,0.6)]">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: category.color }}
                    >
                      <IconComponent className="h-6 w-6" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-primary">{category.name}</CardTitle>
                      <p className="text-sm text-secondary">{category.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-xs font-medium text-primary">{category.icon}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-6 rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white to-[#F2F4FF] p-6 shadow-[0_20px_40px_-20px_rgba(15,23,42,0.4)]">
          <div className="text-center">
            <Tag className="mx-auto mb-4 h-12 w-12 text-primary opacity-50" aria-hidden />
            <h3 className="text-lg font-semibold text-primary">Kategori Default</h3>
            <p className="mt-2 text-sm text-secondary">
              Kategori pengeluaran ini telah disediakan secara default untuk memudahkan pengelompokan transaksi.
              Anda dapat menggunakan kategori ini saat menambahkan pengeluaran baru.
            </p>
            <p className="mt-4 text-xs text-secondary">
              Tip: Pilih kategori yang sesuai untuk setiap pengeluaran agar laporan keuangan lebih terorganisir dan mudah dianalisis.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}