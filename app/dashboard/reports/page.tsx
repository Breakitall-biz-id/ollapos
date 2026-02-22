"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Loader2,
  RefreshCcw,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageLoadingState } from "@/components/page-loading-state"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TableEmptyState } from "@/components/table-empty-state"
import { TablePageHeader } from "@/components/table-page-header"
import { TableSectionCard } from "@/components/table-section-card"
import { getReportsAnalytics } from "@/lib/actions/reports"
import { cn, formatCurrency } from "@/lib/utils"

type PaymentMethod = "cash" | "qris" | "kasbon"
type TrendMode = "daily" | "weekly" | "monthly"
type CategoryFilter = "all" | "gas" | "water" | "general"

type AnalyticsResponse = Awaited<ReturnType<typeof getReportsAnalytics>>
type AnalyticsData = NonNullable<AnalyticsResponse["data"]>
type ReportTransaction = AnalyticsData["transactions"][number]
type ReportItemSale = AnalyticsData["itemSales"][number]
type ReportExpense = AnalyticsData["expenses"][number]
type ReportCapitalEntry = AnalyticsData["capitalEntries"][number]

type RangeSummary = { from?: Date | string | null; to?: Date | string | null }

type ProfitPoint = {
  label: string
  sortValue: number
  grossProfit: number
  netProfit: number
}

type CapitalPoint = {
  label: string
  sortValue: number
  balance: number
  capitalIn: number
  capitalOut: number
}

type SalesPoint = {
  label: string
  sortValue: number
  sales: number
  qty: number
  profit: number
}

type ExpensePoint = {
  label: string
  sortValue: number
  amount: number
}

const DEFAULT_RESERVE_DAYS = 5
const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai",
  qris: "QRIS",
  kasbon: "Kasbon",
}

const PAYMENT_BADGE_CLASS: Record<PaymentMethod, string> = {
  cash: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  qris: "bg-indigo-50 text-indigo-700 border border-indigo-100",
  kasbon: "bg-amber-50 text-amber-700 border border-amber-100",
}

const CHART_COLORS = ["#266dbe", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6"]
const CHART_GRID_STROKE = "#d8e3ef"
const CHART_TICK_STYLE = { fontSize: 11, fill: "#7b8aa3" } as const
const CHART_TOOLTIP_STYLE = {
  background: "#0f172a",
  border: "1px solid rgba(148,163,184,0.25)",
  borderRadius: 10,
  color: "#e2e8f0",
  fontSize: 12,
  boxShadow: "0 8px 20px rgba(15,23,42,0.22)",
} as const
const CHART_TOOLTIP_ITEM_STYLE = { color: "#e2e8f0", fontSize: 12, fontWeight: 600 } as const
const CHART_TOOLTIP_LABEL_STYLE = { color: "#cbd5e1", fontSize: 11, fontWeight: 600 } as const
const CHART_TOOLTIP_WRAPPER_STYLE = { outline: "none", zIndex: 40 } as const

const createDefaultRange = (): DateRange => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 29)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(0, 0, 0, 0)
  return { from: start, to: end }
}

const normalizeClientRange = (range?: DateRange) => {
  if (!range?.from) return undefined
  const from = new Date(range.from)
  from.setHours(0, 0, 0, 0)

  const toSource = range.to ?? range.from
  const to = new Date(toSource)
  to.setHours(0, 0, 0, 0)

  return { from, to }
}

const formatDateLabel = (value: Date | string | null | undefined) => {
  if (!value) return "—"
  const parsed = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

const formatRangeLabel = (range?: RangeSummary) => {
  if (!range?.from) return "Hari ini"
  const fromLabel = formatDateLabel(range.from)
  const toLabel = formatDateLabel(range.to ?? range.from)
  return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`
}

const formatAxisNumber = (value: number) => {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return `${Math.round(value)}`
}

const bucketStartOfWeek = (date: Date) => {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = (day + 6) % 7
  copy.setDate(copy.getDate() - diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const bucketMeta = (raw: Date, mode: TrendMode) => {
  const date = new Date(raw)
  date.setHours(0, 0, 0, 0)

  if (mode === "daily") {
    return {
      key: date.toISOString().slice(0, 10),
      sortValue: date.getTime(),
      label: date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
    }
  }

  if (mode === "weekly") {
    const start = bucketStartOfWeek(date)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return {
      key: start.toISOString().slice(0, 10),
      sortValue: start.getTime(),
      label: `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`,
    }
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
  return {
    key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
    sortValue: monthStart.getTime(),
    label: monthStart.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
  }
}

const buildProfitSeries = (
  transactions: ReportTransaction[],
  expenses: ReportExpense[],
  mode: TrendMode,
): ProfitPoint[] => {
  const map = new Map<string, ProfitPoint & { expense: number }>()

  for (const tx of transactions) {
    const createdAt = new Date(tx.createdAt)
    if (Number.isNaN(createdAt.getTime())) continue

    const meta = bucketMeta(createdAt, mode)
    const txProfit = tx.totalProfit > 0 ? tx.totalProfit : tx.totalAmount - tx.totalCost
    const bucket = map.get(meta.key)

    if (!bucket) {
      map.set(meta.key, {
        label: meta.label,
        sortValue: meta.sortValue,
        grossProfit: txProfit,
        expense: 0,
        netProfit: txProfit,
      })
      continue
    }

    bucket.grossProfit += txProfit
    bucket.netProfit += txProfit
  }

  for (const exp of expenses) {
    const date = new Date(exp.expenseDate)
    if (Number.isNaN(date.getTime())) continue

    const meta = bucketMeta(date, mode)
    const bucket = map.get(meta.key)

    if (!bucket) {
      map.set(meta.key, {
        label: meta.label,
        sortValue: meta.sortValue,
        grossProfit: 0,
        expense: exp.amount,
        netProfit: -exp.amount,
      })
      continue
    }

    bucket.expense += exp.amount
    bucket.netProfit -= exp.amount
  }

  return Array.from(map.values())
    .sort((a, b) => a.sortValue - b.sortValue)
    .map(({ expense: _expense, ...rest }) => rest)
}

const buildCapitalSeries = (
  entries: ReportCapitalEntry[],
  openingBalance: number,
  mode: TrendMode,
): CapitalPoint[] => {
  const grouped = new Map<string, { label: string; sortValue: number; capitalIn: number; capitalOut: number }>()

  for (const entry of entries) {
    const date = new Date(entry.createdAt)
    if (Number.isNaN(date.getTime())) continue

    const meta = bucketMeta(date, mode)
    const current = grouped.get(meta.key)

    if (!current) {
      grouped.set(meta.key, {
        label: meta.label,
        sortValue: meta.sortValue,
        capitalIn: entry.type === "in" ? entry.amount : 0,
        capitalOut: entry.type === "out" ? entry.amount : 0,
      })
      continue
    }

    if (entry.type === "in") {
      current.capitalIn += entry.amount
    } else {
      current.capitalOut += entry.amount
    }
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => a.sortValue - b.sortValue)
  if (sorted.length === 0) {
    return [{ label: "Saldo Awal", sortValue: 0, balance: openingBalance, capitalIn: 0, capitalOut: 0 }]
  }

  let running = openingBalance
  return sorted.map((bucket) => {
    running += bucket.capitalIn - bucket.capitalOut
    return {
      label: bucket.label,
      sortValue: bucket.sortValue,
      balance: running,
      capitalIn: bucket.capitalIn,
      capitalOut: bucket.capitalOut,
    }
  })
}

const buildMonthlySalesSeries = (
  rows: ReportItemSale[],
  categoryFilter: CategoryFilter,
  productFilter: string,
): SalesPoint[] => {
  const map = new Map<string, SalesPoint>()

  for (const row of rows) {
    if (categoryFilter !== "all" && row.productCategory !== categoryFilter) continue
    if (productFilter !== "all" && row.productId !== productFilter) continue

    const date = new Date(row.createdAt)
    if (Number.isNaN(date.getTime())) continue
    const meta = bucketMeta(date, "monthly")

    const existing = map.get(meta.key)
    if (!existing) {
      map.set(meta.key, {
        label: meta.label,
        sortValue: meta.sortValue,
        sales: row.subtotal,
        qty: row.qty,
        profit: row.profit,
      })
      continue
    }

    existing.sales += row.subtotal
    existing.qty += row.qty
    existing.profit += row.profit
  }

  return Array.from(map.values()).sort((a, b) => a.sortValue - b.sortValue)
}

const buildTopProductSeries = (
  rows: ReportItemSale[],
  categoryFilter: CategoryFilter,
  productFilter: string,
) => {
  const map = new Map<string, { name: string; sales: number; qty: number; profit: number }>()

  for (const row of rows) {
    if (categoryFilter !== "all" && row.productCategory !== categoryFilter) continue
    if (productFilter !== "all" && row.productId !== productFilter) continue

    const current = map.get(row.productId)
    if (!current) {
      map.set(row.productId, {
        name: row.productName,
        sales: row.subtotal,
        qty: row.qty,
        profit: row.profit,
      })
      continue
    }

    current.sales += row.subtotal
    current.qty += row.qty
    current.profit += row.profit
  }

  return Array.from(map.values())
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8)
    .map((row) => ({
      ...row,
      shortName: row.name.length > 18 ? `${row.name.slice(0, 18)}…` : row.name,
    }))
}

const buildExpenseCategorySeries = (expenses: ReportExpense[]) => {
  const grouped = new Map<string, { name: string; amount: number; color: string }>()

  for (const expense of expenses) {
    const current = grouped.get(expense.categoryId)
    if (!current) {
      grouped.set(expense.categoryId, {
        name: expense.categoryName,
        amount: expense.amount,
        color: expense.categoryColor,
      })
      continue
    }

    current.amount += expense.amount
  }

  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount)
}

const buildExpenseTrendSeries = (expenses: ReportExpense[]) => {
  const map = new Map<string, ExpensePoint>()

  for (const expense of expenses) {
    const date = new Date(expense.expenseDate)
    if (Number.isNaN(date.getTime())) continue

    const meta = bucketMeta(date, "monthly")
    const current = map.get(meta.key)
    if (!current) {
      map.set(meta.key, {
        label: meta.label,
        sortValue: meta.sortValue,
        amount: expense.amount,
      })
      continue
    }

    current.amount += expense.amount
  }

  return Array.from(map.values()).sort((a, b) => a.sortValue - b.sortValue)
}

const csvEscape = (value: string | number) => {
  const text = typeof value === "number" ? String(value) : value
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  if (typeof window === "undefined") return
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

const asNumber = (value: unknown): number => {
  if (Array.isArray(value)) {
    return asNumber(value[0])
  }
  if (typeof value === "number") return value
  if (typeof value === "string") {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : 0
  }
  return 0
}

function MetricCard({
  title,
  value,
  hint,
  icon,
  tone = "default",
}: {
  title: string
  value: string
  hint: string
  icon: ReactNode
  tone?: "default" | "positive" | "negative"
}) {
  return (
    <div className="report-kpi-card">
      <div className="report-kpi-head">
        <p className="report-kpi-title">{title}</p>
        <span className="report-kpi-icon">{icon}</span>
      </div>
      <p
        className={cn(
          "report-kpi-value",
          tone === "positive" && "report-kpi-value-positive",
          tone === "negative" && "report-kpi-value-negative",
        )}
      >
        {value}
      </p>
      <p className="report-kpi-hint">{hint}</p>
    </div>
  )
}

export default function ReportsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [trendMode, setTrendMode] = useState<TrendMode>("daily")

  const [dateRange, setDateRange] = useState<DateRange>(() => createDefaultRange())
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(() => createDefaultRange())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const rangeRef = useRef(dateRange)

  useEffect(() => {
    rangeRef.current = dateRange
  }, [dateRange])

  const loadReports = useCallback(async (range?: DateRange, initial = false) => {
    const normalized = normalizeClientRange(range ?? rangeRef.current)

    if (initial) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const payload = normalized
        ? { from: normalized.from.toISOString(), to: normalized.to.toISOString() }
        : undefined

      const response = await getReportsAnalytics(payload)
      if (!response.success || !response.data) {
        throw new Error(response.error ?? "Gagal memuat laporan")
      }

      setAnalytics(response.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat laporan")
    } finally {
      if (initial) {
        setLoading(false)
      } else {
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadReports(rangeRef.current, true)
  }, [loadReports])

  useEffect(() => {
    if (isCalendarOpen) {
      setPendingRange(dateRange)
    }
  }, [isCalendarOpen, dateRange])

  const transactions = analytics?.transactions ?? []
  const itemSales = analytics?.itemSales ?? []
  const expenses = analytics?.expenses ?? []
  const capitalEntries = analytics?.capitalEntries ?? []

  const filteredTransactions = useMemo(() => {
    let rows = [...transactions]

    if (searchTerm) {
      const keyword = searchTerm.toLowerCase()
      rows = rows.filter((row) => {
        return (
          row.id.toLowerCase().includes(keyword) ||
          (row.customerName ?? "").toLowerCase().includes(keyword)
        )
      })
    }

    if (paymentFilter !== "all") {
      rows = rows.filter((row) => row.paymentMethod === paymentFilter)
    }

    return rows
  }, [transactions, searchTerm, paymentFilter])

  const productOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const row of itemSales) {
      if (categoryFilter !== "all" && row.productCategory !== categoryFilter) continue
      map.set(row.productId, row.productName)
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "id-ID"))
  }, [itemSales, categoryFilter])

  useEffect(() => {
    if (productFilter === "all") return
    const exists = productOptions.some((product) => product.id === productFilter)
    if (!exists) {
      setProductFilter("all")
    }
  }, [productFilter, productOptions])

  const totalSales = useMemo(() => transactions.reduce((sum, row) => sum + row.totalAmount, 0), [transactions])
  const totalCogs = useMemo(() => transactions.reduce((sum, row) => sum + row.totalCost, 0), [transactions])

  const grossProfit = useMemo(
    () => transactions.reduce((sum, row) => sum + (row.totalProfit > 0 ? row.totalProfit : row.totalAmount - row.totalCost), 0),
    [transactions],
  )

  const totalExpenses = useMemo(() => expenses.reduce((sum, row) => sum + row.amount, 0), [expenses])
  const netProfit = grossProfit - totalExpenses

  const setoranModal = useMemo(
    () => capitalEntries
      .filter((entry) => entry.type === "in" && !(entry.note ?? "").startsWith("AUTO:"))
      .reduce((sum, entry) => sum + entry.amount, 0),
    [capitalEntries],
  )

  const modalKeluar = useMemo(
    () => capitalEntries.filter((entry) => entry.type === "out").reduce((sum, entry) => sum + entry.amount, 0),
    [capitalEntries],
  )

  const rangeLabel = useMemo(() => {
    if (analytics?.range) {
      return formatRangeLabel({ from: analytics.range.from, to: analytics.range.to })
    }
    return formatRangeLabel(dateRange)
  }, [analytics?.range, dateRange])

  const daysInRange = useMemo(() => {
    const normalized = normalizeClientRange(dateRange)
    if (!normalized) return 1
    const diff = normalized.to.getTime() - normalized.from.getTime()
    return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)) + 1)
  }, [dateRange])

  const dailyBurnRate = (totalCogs + totalExpenses) / daysInRange
  const minimumReserve = dailyBurnRate * DEFAULT_RESERVE_DAYS
  const currentBalance = analytics?.currentCapitalBalance ?? 0
  const availableForOwner = currentBalance - minimumReserve

  const healthStatus = useMemo(() => {
    if (currentBalance <= 0) {
      return {
        label: "Bahaya",
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-100",
        helper: "Saldo modal sudah habis. Jangan ambil dana owner.",
      }
    }

    if (availableForOwner <= 0) {
      return {
        label: "Waspada",
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
        helper: "Dana owner belum aman diambil. Prioritaskan putaran modal.",
      }
    }

    return {
      label: "Aman",
      badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      helper: "Ada buffer modal. Owner bisa ambil sebagian sesuai batas aman.",
    }
  }, [currentBalance, availableForOwner])

  const profitSeries = useMemo(
    () => buildProfitSeries(transactions, expenses, trendMode),
    [transactions, expenses, trendMode],
  )

  const capitalSeries = useMemo(
    () => buildCapitalSeries(capitalEntries, analytics?.openingCapitalBalance ?? 0, trendMode),
    [capitalEntries, analytics?.openingCapitalBalance, trendMode],
  )

  const salesSeries = useMemo(
    () => buildMonthlySalesSeries(itemSales, categoryFilter, productFilter),
    [itemSales, categoryFilter, productFilter],
  )

  const topProducts = useMemo(
    () => buildTopProductSeries(itemSales, categoryFilter, productFilter),
    [itemSales, categoryFilter, productFilter],
  )

  const expenseCategorySeries = useMemo(() => buildExpenseCategorySeries(expenses), [expenses])
  const expenseTrendSeries = useMemo(() => buildExpenseTrendSeries(expenses), [expenses])

  const handleApplyRange = (nextRange?: DateRange) => {
    if (!nextRange?.from) {
      toast.error("Pilih tanggal mulai terlebih dahulu")
      return
    }

    const normalized = normalizeClientRange(nextRange)
    if (!normalized) return

    const applied: DateRange = {
      from: normalized.from,
      to: normalized.to,
    }

    setDateRange(applied)
    setPendingRange(applied)
    void loadReports(applied)
    setIsCalendarOpen(false)
  }

  const handleResetRange = () => {
    const defaultRange = createDefaultRange()
    setDateRange(defaultRange)
    setPendingRange(defaultRange)
    void loadReports(defaultRange)
    setIsCalendarOpen(false)
  }

  const handleExport = (variant: "transactions" | "profit") => {
    if (variant === "transactions") {
      if (filteredTransactions.length === 0) {
        toast.error("Tidak ada transaksi untuk diekspor")
        return
      }

      const rows: Array<Array<string | number>> = [
        ["Transaction ID", "Pelanggan", "Metode", "Item", "Tanggal", "Total"],
        ...filteredTransactions.map((row) => [
          row.id,
          row.customerName ?? "Walk-in",
          PAYMENT_LABEL[row.paymentMethod as PaymentMethod] ?? row.paymentMethod,
          row.itemCount,
          formatDateLabel(row.createdAt),
          row.totalAmount,
        ]),
      ]

      downloadCsv(`laporan-transaksi-${Date.now()}.csv`, rows)
      toast.success("Data transaksi berhasil diunduh")
      return
    }

    const rows: Array<Array<string | number>> = [
      ["Metrik", "Nilai"],
      ["Penjualan Bruto", totalSales],
      ["HPP", totalCogs],
      ["Laba Kotor", grossProfit],
      ["Pengeluaran", totalExpenses],
      ["Laba Bersih", netProfit],
      ["Setoran Modal Manual", setoranModal],
      ["Modal Keluar", modalKeluar],
      ["Saldo Modal Saat Ini", currentBalance],
      ["Modal Minimum Aman", minimumReserve],
      ["Dana Boleh Diambil Owner", Math.max(0, availableForOwner)],
    ]

    downloadCsv(`laporan-profit-modal-${Date.now()}.csv`, rows)
    toast.success("Laporan profit dan modal berhasil diunduh")
  }

  if (loading) {
    return <PageLoadingState title="Menyiapkan laporan bisnis" />
  }

  return (
    <div className="table-page simple-page reports-page">
      <TablePageHeader
        title="Laporan Bisnis"
        subtitle={`Periode ${rangeLabel}`}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Cari transaksi ID atau nama pelanggan"
        rightContent={
          <>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 gap-2 px-5 text-sm">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Ubah Periode
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto space-y-4 rounded-2xl border border-medium/40 p-4" align="end">
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={pendingRange}
                  onSelect={setPendingRange}
                  defaultMonth={pendingRange?.from}
                />
                <div className="flex items-center justify-between gap-3">
                  <Button variant="ghost" size="sm" onClick={handleResetRange}>
                    Reset 30 hari
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsCalendarOpen(false)}>
                      Batal
                    </Button>
                    <Button size="sm" onClick={() => handleApplyRange(pendingRange)}>
                      Terapkan
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 px-5 text-sm">
                  <Download className="mr-2 h-4 w-4" aria-hidden />
                  Unduh
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl border border-medium/40">
                <DropdownMenuItem onClick={() => handleExport("transactions")}>Transaksi (CSV)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("profit")}>Profit & Modal (CSV)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button className="h-11 px-5 text-sm" onClick={() => void loadReports()} disabled={refreshing}>
              {refreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
              )}
              Muat Ulang
            </Button>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Penjualan Bruto"
          value={formatCurrency(totalSales)}
          hint={`${transactions.length} transaksi`}
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          title="HPP"
          value={formatCurrency(totalCogs)}
          hint="Modal barang terjual"
          icon={<Wallet className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          title="Laba Kotor"
          value={formatCurrency(grossProfit)}
          hint="Sebelum pengeluaran"
          tone={grossProfit >= 0 ? "positive" : "negative"}
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          title="Pengeluaran"
          value={formatCurrency(totalExpenses)}
          hint={`${expenses.length} catatan pengeluaran`}
          icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          title="Laba Bersih"
          value={formatCurrency(netProfit)}
          hint="Setelah pengeluaran"
          tone={netProfit >= 0 ? "positive" : "negative"}
          icon={<TrendingUp className="h-4 w-4" aria-hidden />}
        />
        <MetricCard
          title="Saldo Modal Saat Ini"
          value={formatCurrency(currentBalance)}
          hint={`Setoran manual: ${formatCurrency(setoranModal)}`}
          icon={<Wallet className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TableSectionCard
          title="Tren Profit"
          description="Laba kotor vs laba bersih berdasarkan periode"
          controls={
            <Select value={trendMode} onValueChange={(value) => setTrendMode(value as TrendMode)}>
              <SelectTrigger className="h-10 w-[150px] rounded-lg border-medium/40 bg-white">
                <SelectValue placeholder="Pilih tren" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          }
          isEmpty={profitSeries.length === 0}
          emptyState={<TableEmptyState title="Belum ada data profit" description="Transaksi dan pengeluaran belum cukup untuk dibentuk grafik." icon={TrendingUp} />}
        >
          <div className="report-chart-wrap h-[320px] w-full p-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={profitSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis tickFormatter={formatAxisNumber} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ stroke: "#c7d3e4", strokeDasharray: "4 4" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                  formatter={(value) => formatCurrency(asNumber(value))}
                />
                <Line type="monotone" dataKey="grossProfit" name="Laba Kotor" stroke="#266dbe" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="netProfit" name="Laba Bersih" stroke="#10b981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="report-chart-legend px-3 pb-3">
            <span className="report-legend-item">
              <span className="report-legend-dot bg-[#266dbe]" />
              Laba Kotor
            </span>
            <span className="report-legend-item">
              <span className="report-legend-dot bg-[#10b981]" />
              Laba Bersih
            </span>
          </div>
        </TableSectionCard>

        <TableSectionCard
          title="Kesehatan Modal"
          description="Pantau apakah modal aman dipakai atau harus ditahan"
          headerContent={
            <Badge className={cn("rounded-full px-3 py-1 text-xs font-semibold", healthStatus.badgeClass)}>
              {healthStatus.label}
            </Badge>
          }
          isEmpty={capitalSeries.length === 0}
          emptyState={<TableEmptyState title="Belum ada data modal" description="Belum ada pergerakan modal di periode ini." icon={Wallet} />}
        >
          <div className="space-y-3 p-3">
            <div className="grid gap-2 rounded-xl border border-[#e7edf6] bg-[#fbfdff] p-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">Modal Minimum Aman</p>
                <p className="mt-1 text-lg font-semibold text-[#101828]">{formatCurrency(minimumReserve)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98a2b3]">Dana Boleh Diambil Owner</p>
                <p className={cn("mt-1 text-lg font-semibold", availableForOwner > 0 ? "text-emerald-600" : "text-rose-600")}>{formatCurrency(Math.max(0, availableForOwner))}</p>
              </div>
              <p className="sm:col-span-2 flex items-center gap-2 text-xs text-[#667085]">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                {healthStatus.helper}
              </p>
            </div>

            <div className="report-chart-wrap h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={capitalSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="capitalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#266dbe" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#266dbe" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_GRID_STROKE} />
                  <XAxis dataKey="label" tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={8} />
                  <YAxis tickFormatter={formatAxisNumber} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} width={56} />
                  <Tooltip
                    cursor={{ stroke: "#c7d3e4", strokeDasharray: "4 4" }}
                    contentStyle={CHART_TOOLTIP_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                    formatter={(value) => formatCurrency(asNumber(value))}
                  />
                  <Area type="monotone" dataKey="balance" stroke="#266dbe" strokeWidth={2.5} fill="url(#capitalFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TableSectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TableSectionCard
          title="Penjualan Bulanan"
          description="Filter kategori atau produk untuk analisis bulanan"
          controls={
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as CategoryFilter)}>
                <SelectTrigger className="h-10 w-[170px] rounded-lg border-medium/40 bg-white">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="gas">Gas LPG</SelectItem>
                  <SelectItem value="water">Air Galon</SelectItem>
                  <SelectItem value="general">Umum</SelectItem>
                </SelectContent>
              </Select>

              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="h-10 w-[190px] rounded-lg border-medium/40 bg-white">
                  <SelectValue placeholder="Semua Produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Produk</SelectItem>
                  {productOptions.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          isEmpty={salesSeries.length === 0}
          emptyState={<TableEmptyState title="Belum ada penjualan" description="Tidak ada data penjualan untuk filter saat ini." icon={TrendingUp} />}
        >
          <div className="report-chart-wrap h-[320px] w-full p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesSeries} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis tickFormatter={formatAxisNumber} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ fill: "rgba(38,109,190,0.06)" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                  formatter={(value: number, name) =>
                    name === "qty" ? [`${value} unit`, "Qty"] : [formatCurrency(value), "Sales"]
                  }
                />
                <Bar dataKey="sales" name="sales" fill="#266dbe" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TableSectionCard>

        <TableSectionCard
          title="Top Produk"
          description="Produk paling laku dalam periode terpilih"
          isEmpty={topProducts.length === 0}
          emptyState={<TableEmptyState title="Belum ada produk terjual" description="Top produk muncul setelah ada penjualan." icon={TrendingUp} />}
        >
          <div className="report-chart-wrap h-[320px] w-full p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ top: 8, right: 12, left: 18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis type="number" tickFormatter={formatAxisNumber} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="shortName" width={110} tick={{ fontSize: 11, fill: "#667085" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(38,109,190,0.06)" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                  formatter={(value) => formatCurrency(asNumber(value))}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TableSectionCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TableSectionCard
          title="Komposisi Pengeluaran"
          description="Pengeluaran berdasarkan kategori"
          isEmpty={expenseCategorySeries.length === 0}
          emptyState={<TableEmptyState title="Belum ada pengeluaran" description="Tambah pengeluaran untuk melihat komposisinya." icon={Wallet} />}
        >
          <div className="grid gap-2 p-3 md:grid-cols-[1fr_220px]">
            <div className="report-chart-wrap h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={expenseCategorySeries} dataKey="amount" nameKey="name" innerRadius={72} outerRadius={108} paddingAngle={2}>
                    {expenseCategorySeries.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                    labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                    wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                    formatter={(value, name) => [formatCurrency(asNumber(value)), String(name ?? "Kategori")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="report-pie-legend space-y-2">
              {expenseCategorySeries.map((entry, index) => (
                <div
                  key={`${entry.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#e7edf6] bg-white px-2.5 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color || CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="truncate text-xs font-medium text-[#475467]">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-[#101828]">{formatCurrency(entry.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </TableSectionCard>

        <TableSectionCard
          title="Tren Pengeluaran Bulanan"
          description="Lihat kenaikan atau penurunan pengeluaran setiap bulan"
          isEmpty={expenseTrendSeries.length === 0}
          emptyState={<TableEmptyState title="Belum ada tren pengeluaran" description="Data tren akan muncul setelah ada pengeluaran." icon={Wallet} />}
        >
          <div className="report-chart-wrap h-[320px] w-full p-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={expenseTrendSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={CHART_GRID_STROKE} />
                <XAxis dataKey="label" tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} tickMargin={8} />
                <YAxis tickFormatter={formatAxisNumber} tick={CHART_TICK_STYLE} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ stroke: "#f0b2b2", strokeDasharray: "4 4" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  wrapperStyle={CHART_TOOLTIP_WRAPPER_STYLE}
                  formatter={(value) => formatCurrency(asNumber(value))}
                />
                <Area dataKey="amount" stroke="#ef4444" strokeWidth={2.5} fill="url(#expenseFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </TableSectionCard>
      </div>

      <TableSectionCard
        title="Daftar Transaksi"
        description={`${filteredTransactions.length} transaksi ditemukan`}
        controls={
          <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentMethod | "all")}>
            <SelectTrigger className="h-10 w-full rounded-lg border-medium/40 bg-white sm:w-[190px]">
              <SelectValue placeholder="Semua Metode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Metode</SelectItem>
              <SelectItem value="cash">Tunai</SelectItem>
              <SelectItem value="qris">QRIS</SelectItem>
              <SelectItem value="kasbon">Kasbon</SelectItem>
            </SelectContent>
          </Select>
        }
        isEmpty={filteredTransactions.length === 0}
        emptyState={<TableEmptyState title="Belum ada transaksi" description="Coba ubah filter pencarian atau rentang tanggal." icon={Wallet} />}
        footer={
          <>
            <span>Menampilkan {filteredTransactions.length} transaksi</span>
            <span>{rangeLabel}</span>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaksi</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((row) => {
              const payment = (row.paymentMethod as PaymentMethod) || "cash"
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="text-sm font-semibold text-primary">{row.id}</p>
                    <p className="text-xs text-muted">{row.status}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-primary">{row.customerName ?? "Walk-in"}</p>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", PAYMENT_BADGE_CLASS[payment])}>
                      {PAYMENT_LABEL[payment]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-primary">{row.itemCount}</TableCell>
                  <TableCell className="text-sm text-secondary">{formatDateLabel(row.createdAt)}</TableCell>
                  <TableCell className="text-right text-sm font-semibold text-primary">{formatCurrency(row.totalAmount)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableSectionCard>
    </div>
  )
}
