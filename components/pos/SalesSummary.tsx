"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ChevronRight,
  DollarSign,
  Package,
  Receipt,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { getSalesSummary, getTransactionsToday } from "@/lib/actions/transactions"

interface DailyTransaction {
  id: string
  totalAmount: number
  itemCount: number
  paymentMethod: string
  status: string
  createdAt: string
  customerName?: string
  customerDiscountPercent?: number
}

const paymentBadgeMeta: Record<string, { label: string; className: string }> = {
  cash: { label: "Cash", className: "border-transparent bg-emerald-50 text-emerald-600" },
  qris: { label: "QRIS", className: "border-transparent bg-sky-50 text-sky-600" },
  kasbon: { label: "Kasbon", className: "border-transparent bg-amber-50 text-amber-600" },
  default: { label: "Pembayaran", className: "border-transparent bg-slate-50 text-slate-600" },
}

interface SalesSummaryProps {
  inline?: boolean
}

export function SalesSummary({ inline = false }: SalesSummaryProps) {
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalItems: 0,
    transactionCount: 0,
    date: new Date().toISOString().split("T")[0],
  })
  const [transactions, setTransactions] = useState<DailyTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const summaryResult = await getSalesSummary()
      if (summaryResult.success) {
        setSalesData(summaryResult.data)
      }

      const transactionsResult = await getTransactionsToday()
      if (transactionsResult.success) {
        setTransactions(transactionsResult.data as DailyTransaction[])
      }
    } catch (error) {
      console.error("Error loading sales data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const formattedDate = useMemo(
    () =>
      new Date(salesData.date).toLocaleDateString("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [salesData.date]
  )

  const metrics = useMemo(
    () => [
      {
        id: "total-sales",
        label: "Total penjualan",
        value: formatCurrency(salesData.totalSales),
        icon: DollarSign,
        iconClassName: "bg-indigo-100 text-indigo-600",
      },
      {
        id: "transactions",
        label: "Transaksi",
        value: salesData.transactionCount.toLocaleString("id-ID"),
        icon: ShoppingCart,
        iconClassName: "bg-emerald-100 text-emerald-600",
      },
      {
        id: "items-sold",
        label: "Item terjual",
        value: salesData.totalItems.toLocaleString("id-ID"),
        icon: Package,
        iconClassName: "bg-sky-100 text-sky-600",
      },
    ],
    [salesData.totalItems, salesData.totalSales, salesData.transactionCount]
  )

  const renderTransactionList = () => {
    if (transactions.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-medium/60 bg-surface-tertiary px-6 py-8 text-center">
          <Receipt className="mx-auto mb-3 size-10 text-muted" aria-hidden />
          <p className="text-sm font-medium text-secondary">Belum ada transaksi hari ini</p>
          <p className="text-xs text-muted">Transaksi akan muncul setelah pembayaran berhasil</p>
        </div>
      )
    }

    return (
      <div className="max-h-60 w-full space-y-3 overflow-y-auto pr-1">
        {transactions.map((transaction) => {
          const paymentMeta = paymentBadgeMeta[transaction.paymentMethod] ?? paymentBadgeMeta.default
          const transactionTime = new Date(transaction.createdAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          })

          return (
            <div
              key={transaction.id}
              className="w-full overflow-hidden rounded-2xl border border-medium/60 bg-white px-4 py-4 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.55)] transition-all hover:border-primary/40"
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <p className="truncate font-mono font-semibold text-primary">
                      {transaction.id.slice(-8).toUpperCase()}
                    </p>
                    <span className="text-xs text-muted">{transactionTime}</span>
                  </div>
                  {transaction.customerName && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                      <span className="truncate font-semibold text-primary">{transaction.customerName}</span>
                      {transaction.customerDiscountPercent && transaction.customerDiscountPercent > 0 && (
                        <Badge className="border-transparent bg-emerald-50 text-emerald-600">
                          {transaction.customerDiscountPercent}% Diskon
                        </Badge>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-secondary">
                    <Badge className={paymentMeta.className}>{paymentMeta.label}</Badge>
                    <span className="text-xs text-muted">{transaction.itemCount} item</span>
                  </div>
                </div>
                <p className="whitespace-nowrap text-right text-lg font-semibold text-primary">
                  {formatCurrency(transaction.totalAmount)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (inline) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Ringkasan</p>
            <p className="text-sm text-secondary">{formattedDate}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-secondary"
              onClick={loadData}
              aria-label="Segarkan ringkasan penjualan"
            >
              <RefreshCw className="size-4" aria-hidden />
              Segarkan
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-full border-medium/40"
              onClick={() => setIsDetailOpen(true)}
            >
              Detail transaksi
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-24 rounded-2xl border border-dashed border-medium/30 bg-white/70" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon
              return (
                <div
                  key={metric.id}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-white/60 bg-white/90 p-4 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.85)]"
                >
                  <span className={`flex size-10 items-center justify-center rounded-full ${metric.iconClassName}`} aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{metric.label}</p>
                    <p className="text-xl font-semibold text-primary">{metric.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detail transaksi hari ini</DialogTitle>
              <p className="text-sm text-secondary">Daftar transaksi yang tercatat otomatis</p>
            </DialogHeader>
            {loading ? (
              <div className="rounded-2xl border border-dashed border-medium/60 bg-surface-tertiary px-6 py-8 text-center">
                <RefreshCw className="mx-auto mb-3 size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm text-secondary">Memuat detail transaksi…</p>
              </div>
            ) : (
              renderTransactionList()
            )}
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="border border-medium/70 bg-surface shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-primary">
            <TrendingUp className="size-5" aria-hidden />
            Ringkasan Penjualan
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <RefreshCw className="size-6 animate-spin text-primary" aria-hidden />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-[24px] border border-medium/60 bg-white shadow-[0_18px_48px_-28px_rgba(15,23,42,0.45)]">
      <CardHeader className="space-y-4 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-primary">
              <span className="flex size-2 rounded-full bg-primary" aria-hidden />
              Ringkasan Penjualan
            </CardTitle>
            <p className="text-sm text-secondary">{formattedDate}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            className="size-9 rounded-xl border-medium/40 bg-white text-secondary shadow-sm transition-all hover:border-primary/40 hover:text-primary"
            aria-label="Muat ulang ringkasan penjualan"
          >
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {metrics.map((metric) => {
            const Icon = metric.icon
            return (
              <div
                key={metric.id}
                className="flex h-full flex-col gap-3 rounded-2xl border border-medium/60 bg-white p-5 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.65)] transition-colors hover:border-primary/40"
              >
                <span className={`flex size-10 items-center justify-center rounded-full ${metric.iconClassName}`} aria-hidden>
                  <Icon className="size-4" />
                </span>
                <div className="space-y-1 text-balance">
                  <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{metric.label}</p>
                  <p className="min-w-0 text-xl font-semibold text-primary leading-tight">{metric.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        <Separator className="bg-medium/40" />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-secondary">
            <span className="size-2 rounded-full bg-primary" aria-hidden />
            Detail transaksi hari ini
          </div>
          {renderTransactionList()}
        </div>
      </CardContent>
    </Card>
  )
}