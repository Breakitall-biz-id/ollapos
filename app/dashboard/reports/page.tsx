"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	BarChart3,
	CalendarDays,
	Download,
	Loader2,
	RefreshCcw,
	Search,
	TicketPercent,
	Wallet,
} from "lucide-react"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart"
import { formatCurrency } from "@/lib/utils"
import { getSalesSummary, getTransactionsToday } from "@/lib/actions"

type PaymentMethod = "cash" | "qris" | "kasbon"
type TrendMode = "daily" | "weekly" | "monthly"

type SalesSummaryResponse = Awaited<ReturnType<typeof getSalesSummary>>
type SalesSummary = SalesSummaryResponse["data"]

type TransactionsResponse = Awaited<ReturnType<typeof getTransactionsToday>>
type TransactionEntry = TransactionsResponse["data"] extends Array<infer T> ? T : never

type RangeSummary = { from?: Date | string | null; to?: Date | string | null }

type TrendPoint = {
	label: string
	rangeLabel: string
	sales: number
	sortValue: number
}

const VAT_RATE = 0.11
const DEFAULT_COGS_RATIO = 0.72
const DEFAULT_OPEX_RATIO = 0.08

const trendChartConfig = {
	sales: {
		label: "Penjualan",
		color: "hsl(257, 85%, 60%)",
	},
} satisfies ChartConfig

const paymentMeta: Record<PaymentMethod, { label: string; badgeClass: string; accent: string }> = {
	cash: {
		label: "Tunai",
		badgeClass: "bg-emerald-50 text-emerald-600 border border-emerald-100",
		accent: "bg-emerald-500",
	},
	qris: {
		label: "QRIS",
		badgeClass: "bg-indigo-50 text-indigo-600 border border-indigo-100",
		accent: "bg-indigo-500",
	},
	kasbon: {
		label: "Kasbon",
		badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
		accent: "bg-amber-500",
	},
}

const createDefaultRange = (): DateRange => {
	const today = new Date()
	const start = new Date(today)
	start.setDate(start.getDate() - 6)
	start.setHours(0, 0, 0, 0)
	const end = new Date(today)
	end.setHours(0, 0, 0, 0)
	return { from: start, to: end }
}

const formatTimeLabel = (value: string | Date | null | undefined) => {
	if (!value) return "—"
	try {
		const date = typeof value === "string" ? new Date(value) : value
		return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
	} catch {
		return "—"
	}
}

const formatDateLabel = (value: string | Date | null | undefined) => {
	if (!value) return "—"
	try {
		const date = typeof value === "string" ? new Date(value) : value
		return date.toLocaleDateString("id-ID", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		})
	} catch {
		return "—"
	}
}

const formatRangeLabel = (range?: RangeSummary) => {
	if (!range?.from) return "Hari ini"
	const fromLabel = formatDateLabel(range.from)
	const toLabel = formatDateLabel(range.to ?? range.from)
	return fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`
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

const csvEscape = (value: string | number) => {
	const stringValue = typeof value === "number" ? value.toString() : value ?? ""
	if (/[",\n]/.test(stringValue)) {
		return `"${stringValue.replace(/"/g, '""')}"`
	}
	return stringValue
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

const startOfWeek = (date: Date) => {
	const clone = new Date(date)
	const day = clone.getDay()
	const diff = (day + 6) % 7 // convert so Monday is start
	clone.setDate(clone.getDate() - diff)
	clone.setHours(0, 0, 0, 0)
	return clone
}

const endOfWeek = (start: Date) => {
	const clone = new Date(start)
	clone.setDate(clone.getDate() + 6)
	clone.setHours(0, 0, 0, 0)
	return clone
}

const getBucketMeta = (date: Date, mode: TrendMode) => {
	const normalized = new Date(date)
	normalized.setHours(0, 0, 0, 0)

	if (mode === "daily") {
		return {
			key: normalized.toISOString().slice(0, 10),
			label: normalized.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
			rangeLabel: formatDateLabel(normalized),
			sortValue: normalized.getTime(),
		}
	}

	if (mode === "weekly") {
		const start = startOfWeek(normalized)
		const end = endOfWeek(start)
		const shortLabel = `${start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })} - ${end.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}`
		return {
			key: start.toISOString().slice(0, 10),
			label: shortLabel,
			rangeLabel: formatRangeLabel({ from: start, to: end }),
			sortValue: start.getTime(),
		}
	}

	const monthStart = new Date(normalized.getFullYear(), normalized.getMonth(), 1)
	const monthEnd = new Date(normalized.getFullYear(), normalized.getMonth() + 1, 0)
	return {
		key: `${monthStart.getFullYear()}-${monthStart.getMonth()}`,
		label: monthStart.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }),
		rangeLabel: formatRangeLabel({ from: monthStart, to: monthEnd }),
		sortValue: monthStart.getTime(),
	}
}

const buildTrendSeries = (records: TransactionEntry[], mode: TrendMode): TrendPoint[] => {
	const buckets = new Map<string, TrendPoint>()

	for (const tx of records) {
		const rawDate = tx.createdAt ? new Date(tx.createdAt) : undefined
		if (!rawDate || Number.isNaN(rawDate.getTime())) continue
		const amount = Number(tx.totalAmount ?? 0)
		if (!Number.isFinite(amount) || amount <= 0) continue
		const meta = getBucketMeta(rawDate, mode)
		const bucket = buckets.get(meta.key)
		if (bucket) {
			bucket.sales += amount
		} else {
			buckets.set(meta.key, {
				label: meta.label,
				rangeLabel: meta.rangeLabel,
				sales: amount,
				sortValue: meta.sortValue,
			})
		}
	}

	return Array.from(buckets.values()).sort((a, b) => a.sortValue - b.sortValue)
}

export default function ReportsPage() {
	const [summary, setSummary] = useState<SalesSummary | null>(null)
	const [transactions, setTransactions] = useState<TransactionEntry[]>([])
	const [filteredTransactions, setFilteredTransactions] = useState<TransactionEntry[]>([])
	const [loading, setLoading] = useState(true)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [searchTerm, setSearchTerm] = useState("")
	const [paymentFilter, setPaymentFilter] = useState<PaymentMethod | "all">("all")
	const [dateRange, setDateRange] = useState<DateRange>(() => createDefaultRange())
	const [pendingRange, setPendingRange] = useState<DateRange | undefined>(() => createDefaultRange())
	const [isCalendarOpen, setIsCalendarOpen] = useState(false)
	const [trendMode, setTrendMode] = useState<TrendMode>("daily")

	const rangeRef = useRef(dateRange)

	useEffect(() => {
		rangeRef.current = dateRange
	}, [dateRange])

	const loadReports = useCallback(async (range?: DateRange, initial = false) => {
		const normalizedRange = normalizeClientRange(range ?? rangeRef.current)

		if (initial) {
			setLoading(true)
		} else {
			setIsRefreshing(true)
		}

		try {
			const payload = normalizedRange
				? {
					from: normalizedRange.from.toISOString(),
					to: normalizedRange.to.toISOString(),
				}
				: undefined

			const [summaryResponse, transactionsResponse] = await Promise.all([
				getSalesSummary(payload),
				getTransactionsToday(payload),
			])

			if (!summaryResponse.success || !summaryResponse.data) {
				throw new Error(summaryResponse.error ?? "Gagal memuat ringkasan penjualan")
			}

			if (!transactionsResponse.success || !transactionsResponse.data) {
				throw new Error(transactionsResponse.error ?? "Gagal memuat transaksi harian")
			}

			setSummary(summaryResponse.data)
			setTransactions(transactionsResponse.data)
			setFilteredTransactions(transactionsResponse.data)
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Gagal memuat laporan")
		} finally {
			if (initial) {
				setLoading(false)
			} else {
				setIsRefreshing(false)
			}
		}
	}, [])

	useEffect(() => {
		void loadReports(rangeRef.current, true)
	}, [loadReports])

	useEffect(() => {
		let filtered = [...transactions]

		if (searchTerm) {
			const keyword = searchTerm.toLowerCase()
			filtered = filtered.filter((tx) => {
				const idMatch = tx.id?.toLowerCase().includes(keyword)
				const customerMatch = tx.customerName?.toLowerCase().includes(keyword)
				return idMatch || customerMatch
			})
		}

		if (paymentFilter !== "all") {
			filtered = filtered.filter((tx) => tx.paymentMethod === paymentFilter)
		}

		setFilteredTransactions(filtered)
	}, [transactions, searchTerm, paymentFilter])

	useEffect(() => {
		if (isCalendarOpen) {
			setPendingRange(dateRange)
		}
	}, [isCalendarOpen, dateRange])

	const paymentStats = useMemo(() => {
		const base = {
			cash: { count: 0, amount: 0 },
			qris: { count: 0, amount: 0 },
			kasbon: { count: 0, amount: 0 },
		}

		for (const tx of transactions) {
			const payment = tx.paymentMethod as PaymentMethod
			if (!payment) continue
			base[payment].count += 1
			base[payment].amount += Number(tx.totalAmount ?? 0)
		}

		const totalCount = transactions.length || 1
		const totalAmount = Object.values(base).reduce((sum, entry) => sum + entry.amount, 0) || 1

		return {
			breakdown: base,
			countTotal: totalCount,
			amountTotal: totalAmount,
		}
	}, [transactions])

	const ticketAverage = summary && summary.transactionCount > 0 ? summary.totalSales / summary.transactionCount : 0
	const itemsPerTransaction = summary && summary.transactionCount > 0 ? summary.totalItems / summary.transactionCount : 0

	const discountValue = useMemo(() => {
		return transactions.reduce((acc, tx) => {
			const total = Number(tx.totalAmount ?? 0)
			const discountPercent = typeof tx.customerDiscountPercent === "number" ? tx.customerDiscountPercent : 0
			if (discountPercent <= 0 || discountPercent >= 100) {
				return acc
			}
			const baseAmount = total / (1 - discountPercent / 100)
			if (!Number.isFinite(baseAmount)) {
				return acc
			}
			return acc + (baseAmount - total)
		}, 0)
	}, [transactions])

	const profitLoss = useMemo(() => {
		if (!summary) return null

		const netRevenue = Number(summary.totalSales ?? 0)
		const grossRevenue = netRevenue + discountValue
		const recordedCost = typeof summary.totalCost === "number" ? summary.totalCost : Number(summary.totalCost ?? 0)
		const recordedProfit = typeof summary.totalProfit === "number" ? summary.totalProfit : Number(summary.totalProfit ?? 0)
		const costOfGoods = recordedCost > 0 ? recordedCost : netRevenue * DEFAULT_COGS_RATIO
		const grossProfit = recordedProfit > 0 ? recordedProfit : netRevenue - costOfGoods
		const operationalExpenses = netRevenue * DEFAULT_OPEX_RATIO
		const tax = netRevenue * VAT_RATE
		const netProfit = grossProfit - operationalExpenses - tax

		return {
			grossRevenue,
			discounts: discountValue,
			netRevenue,
			costOfGoods,
			grossProfit,
			operationalExpenses,
			tax,
			netProfit,
			hasActualCost: recordedCost > 0,
			hasActualProfit: recordedProfit > 0,
		}
	}, [summary, discountValue])

	const rangeLabel = useMemo(() => {
		if (summary?.range) {
			return formatRangeLabel({ from: summary.range.from, to: summary.range.to })
		}
		return formatRangeLabel(dateRange)
	}, [summary, dateRange])

	const trendSeries = useMemo(() => buildTrendSeries(transactions, trendMode), [transactions, trendMode])

	const handleApplyRange = (nextRange?: DateRange) => {
		if (!nextRange?.from) {
			toast.error("Pilih tanggal mulai terlebih dahulu")
			return
		}

		const normalized = normalizeClientRange(nextRange)
		if (!normalized) return

		const appliedRange: DateRange = {
			from: normalized.from,
			to: normalized.to,
		}

		setDateRange(appliedRange)
		setPendingRange(appliedRange)
		void loadReports(appliedRange)
		setIsCalendarOpen(false)
	}

	const handleResetRange = () => {
		const defaultRange = createDefaultRange()
		setDateRange(defaultRange)
		setPendingRange(defaultRange)
		void loadReports(defaultRange)
		setIsCalendarOpen(false)
	}

	const handleTrendModeChange = (value: TrendMode | "") => {
		if (!value) return
		setTrendMode(value)
	}

	const handleExport = (variant: "sales" | "profit") => {
		if (variant === "sales") {
			if (filteredTransactions.length === 0) {
				toast.error("Tidak ada transaksi untuk diekspor")
				return
			}

			const headers = ["Transaction ID", "Pelanggan", "Metode", "Item", "Tanggal", "Waktu", "Total"]
			const rows = filteredTransactions.map((tx) => [
				tx.id,
				tx.customerName ?? "Walk-in",
				paymentMeta[tx.paymentMethod as PaymentMethod]?.label ?? tx.paymentMethod,
				String(tx.itemCount ?? 0),
				formatDateLabel(tx.createdAt),
				formatTimeLabel(tx.createdAt),
				Number(tx.totalAmount ?? 0).toString(),
			])

			const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")
			const fileName = `penjualan-${slugify(rangeLabel || "periode")}.csv`

			if (typeof window === "undefined") return
			const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.setAttribute("download", fileName)
			document.body.appendChild(link)
			link.click()
			link.remove()
			window.URL.revokeObjectURL(url)
			toast.success("Data penjualan berhasil diunduh")
			return
		}

		if (!profitLoss) {
			toast.error("Data laba rugi belum siap")
			return
		}

		const headers = ["Kategori", "Nilai (IDR)"]
		const rows = [
			["Pendapatan Bruto", formatCurrency(profitLoss.grossRevenue)],
			["Diskon", formatCurrency(profitLoss.discounts)],
			["Penjualan Bersih", formatCurrency(profitLoss.netRevenue)],
			[
				profitLoss.hasActualCost
					? "HPP (Data POS)"
					: `HPP (Estimasi ${Math.round(DEFAULT_COGS_RATIO * 100)}%)`,
				formatCurrency(profitLoss.costOfGoods),
			],
			["Laba Kotor", formatCurrency(profitLoss.grossProfit)],
			[
				`Beban Operasional (${Math.round(DEFAULT_OPEX_RATIO * 100)}%)`,
				formatCurrency(profitLoss.operationalExpenses),
			],
			[`PPN ${Math.round(VAT_RATE * 100)}%`, formatCurrency(profitLoss.tax)],
			[
				profitLoss.hasActualProfit ? "Laba Bersih (Data POS)" : "Laba Bersih",
				formatCurrency(profitLoss.netProfit),
			],
		]

		const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")
		const fileName = `laba-rugi-${slugify(rangeLabel || "periode")}.csv`

		if (typeof window === "undefined") return
		const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
		const url = window.URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.setAttribute("download", fileName)
		document.body.appendChild(link)
		link.click()
		link.remove()
		window.URL.revokeObjectURL(url)
		toast.success("Laporan laba rugi berhasil diunduh")
	}

	if (loading) {
		return (
			<div className="flex min-h-[420px] items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-secondary">
					<Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
					<p className="text-base font-medium">Menyiapkan laporan penjualan…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8 px-6 pb-12">
			<div className="flex flex-wrap items-center justify-between gap-4 py-4">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted">Dashboard</p>
					<h1 className="text-3xl font-semibold text-primary">Laporan Penjualan</h1>
					<p className="text-sm text-secondary">Periode {rangeLabel}</p>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								className="h-11 min-w-[220px] justify-start gap-2 rounded-xl border-medium/60 px-5 text-left text-sm font-semibold text-secondary"
							>
								<CalendarDays className="h-4 w-4" aria-hidden />
								<span>Filter tanggal</span>
								<span className="font-normal text-muted">{rangeLabel}</span>
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
									Reset 7 hari
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
							<Button
								variant="outline"
								className="h-11 rounded-xl border-medium/60 px-5 text-sm font-semibold"
							>
								<Download className="mr-2 h-4 w-4" aria-hidden />
								Unduh Laporan
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48 rounded-xl border border-medium/40">
							<DropdownMenuItem onClick={() => handleExport("sales")}>
								Penjualan (CSV)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport("profit")}>
								Laba Rugi (CSV)
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						className="h-11 rounded-xl px-5 text-sm font-semibold"
						onClick={() => void loadReports()}
						disabled={isRefreshing}
					>
						{isRefreshing ? (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
						) : (
							<RefreshCcw className="mr-2 h-4 w-4" aria-hidden />
						)}
						Muat Ulang
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="space-y-3 p-6">
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Total Sales</p>
							<Wallet className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<p className="text-3xl font-semibold text-primary">{formatCurrency(summary?.totalSales ?? 0)}</p>
						<p className="text-xs text-secondary">Periode {rangeLabel}</p>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="space-y-3 p-6">
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Transaksi</p>
							<BarChart3 className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<p className="text-3xl font-semibold text-primary">{summary?.transactionCount ?? 0}</p>
						<p className="text-xs text-secondary">Rata-rata item {itemsPerTransaction.toFixed(1)} / transaksi</p>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="space-y-3 p-6">
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Item Terjual</p>
							<TicketPercent className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<p className="text-3xl font-semibold text-primary">{summary?.totalItems ?? 0}</p>
						<p className="text-xs text-secondary">Avg ticket {formatCurrency(ticketAverage || 0)}</p>
					</CardContent>
				</Card>

				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="space-y-3 p-6">
						<div className="flex items-center justify-between">
							<p className="text-xs font-semibold uppercase tracking-[0.3em] text-secondary">Payment Mix</p>
							<Wallet className="h-5 w-5 text-primary" aria-hidden />
						</div>
						<div className="space-y-2">
							{(Object.keys(paymentMeta) as PaymentMethod[]).map((method) => {
								const data = paymentStats.breakdown[method]
								const percentage = Math.round((data.amount / paymentStats.amountTotal) * 100)
								return (
									<div key={method} className="space-y-1">
										<div className="flex items-center justify-between text-xs text-secondary">
											<span className="font-medium text-primary">{paymentMeta[method].label}</span>
											<span>{percentage || 0}%</span>
										</div>
										<div className="h-2 rounded-full bg-surface-secondary">
											<div
												className={`h-2 rounded-full ${paymentMeta[method].accent}`}
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								)
							})}
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
				<CardHeader className="flex flex-wrap items-center justify-between gap-4 border-b border-medium/40 pb-5">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-primary">
							<span className="h-2 w-2 rounded-xl bg-primary" aria-hidden />
							Tren Penjualan
						</div>
						<p className="text-sm text-secondary">Visualisasi pendapatan berdasarkan pilihan periode.</p>
					</div>
					<ToggleGroup
						type="single"
						value={trendMode}
						onValueChange={handleTrendModeChange}
						variant="outline"
						size="sm"
						className="rounded-lg shadow-xs"
					>
						<ToggleGroupItem value="daily" aria-label="Tampilkan tren harian">
							Harian
						</ToggleGroupItem>
						<ToggleGroupItem value="weekly" aria-label="Tampilkan tren mingguan">
							Mingguan
						</ToggleGroupItem>
						<ToggleGroupItem value="monthly" aria-label="Tampilkan tren bulanan">
							Bulanan
						</ToggleGroupItem>
					</ToggleGroup>
				</CardHeader>
				<CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
					{trendSeries.length > 0 ? (
						<ChartContainer config={trendChartConfig} className="aspect-auto h-[320px] w-full">
							<AreaChart data={trendSeries} margin={{ left: 12, right: 12 }}>
								<defs>
									<linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.8} />
										<stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0.05} />
									</linearGradient>
								</defs>
								<CartesianGrid vertical={false} strokeDasharray="3 3" />
								<XAxis
									dataKey="label"
									tickLine={false}
									axisLine={false}
									tickMargin={10}
									minTickGap={20}
								/>
								<ChartTooltip
									cursor={false}
									content={
										<ChartTooltipContent
											indicator="dot"
											labelFormatter={(_, payload) => payload?.[0]?.payload.rangeLabel ?? ""}
											formatter={(value) => (
												<div className="flex w-full items-center justify-between gap-4">
													<span>Penjualan</span>
													<span className="font-mono font-semibold text-primary">
														{formatCurrency(Number(value) || 0)}
													</span>
												</div>
											)}
										/>
									}
								/>
								<Area
									type="monotone"
									dataKey="sales"
									stroke="var(--color-sales)"
									strokeWidth={3}
									fill="url(#fillSales)"
									activeDot={{ r: 5 }}
								/>
							</AreaChart>
						</ChartContainer>
					) : (
						<div className="rounded-lg border border-dashed border-medium/50 py-12 text-center text-secondary">
							Belum ada data tren untuk rentang tanggal ini.
						</div>
					)}
				</CardContent>
			</Card>

			<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
				<CardHeader className="space-y-2 border-b border-medium/40 pb-5">
					<div className="flex items-center gap-2 text-sm font-medium text-primary">
						<span className="h-2 w-2 rounded-xl bg-primary" aria-hidden />
						Laporan Laba Rugi
					</div>
					<p className="text-sm text-secondary">Estimasi otomatis untuk kebutuhan akuntansi & pajak.</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{profitLoss ? (
						<div className="divide-y divide-medium/30 rounded-xl border border-medium/40">
							{[
								{ key: "gross", label: "Pendapatan Bruto", value: profitLoss.grossRevenue },
								{ key: "discounts", label: "Diskon Membership", value: profitLoss.discounts, prefix: "-" },
								{ key: "net", label: "Penjualan Bersih", value: profitLoss.netRevenue, highlight: true },
								{
									key: "cogs",
									label: profitLoss.hasActualCost
										? "HPP (Data POS)"
										: `HPP (Estimasi ${Math.round(DEFAULT_COGS_RATIO * 100)}%)`,
									value: profitLoss.costOfGoods,
									prefix: "-",
								},
								{ key: "grossProfit", label: "Laba Kotor", value: profitLoss.grossProfit },
								{
									key: "opex",
									label: `Beban Operasional (${Math.round(DEFAULT_OPEX_RATIO * 100)}%)`,
									value: profitLoss.operationalExpenses,
									prefix: "-",
								},
								{
									key: "tax",
									label: `PPN ${Math.round(VAT_RATE * 100)}%`,
									value: profitLoss.tax,
									prefix: "-",
								},
								{
									key: "netProfit",
									label: profitLoss.hasActualProfit ? "Laba Bersih (Data POS)" : "Laba Bersih",
									value: profitLoss.netProfit,
									highlight: true,
								},
							].map((row) => (
								<div key={row.key} className="flex items-center justify-between gap-4 px-4 py-3">
									<p className="text-sm font-medium text-primary">{row.label}</p>
									<p className={`text-sm font-semibold ${row.highlight ? "text-primary" : "text-secondary"}`}>
										{row.prefix === "-" ? `- ${formatCurrency(row.value)}` : formatCurrency(row.value)}
									</p>
								</div>
							))}
						</div>
					) : (
						<div className="rounded-lg border border-dashed border-medium/50 px-4 py-8 text-center text-secondary">
							Tidak ada data laba rugi untuk rentang tanggal ini.
						</div>
					)}
					<p className="text-xs text-muted">
						{profitLoss
							? profitLoss.hasActualCost || profitLoss.hasActualProfit
								? "Catatan: HPP dan laba bersih langsung mengambil data aktual dari POS, sedangkan beban operasional & pajak masih estimasi."
								: "Catatan: HPP dan beban operasional dihitung otomatis berdasarkan persentase default dan dapat disesuaikan di modul pengaturan nantinya."
							: "Catatan: sistem akan menghitung HPP dan laba setelah ada transaksi pada rentang tanggal ini."}
					</p>
				</CardContent>
			</Card>

			<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardContent className="space-y-4 p-6">
					<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
						<div className="relative">
							<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
							<Input
								value={searchTerm}
								onChange={(event) => setSearchTerm(event.target.value)}
								placeholder="Cari ID transaksi atau nama pelanggan"
								className="h-12 rounded-lg border-medium/50 pl-11 pr-4 shadow-sm focus-visible:border-primary/60"
							/>
						</div>
						<Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as PaymentMethod | "all")}>
							<SelectTrigger className="h-12 w-full rounded-lg border-medium/50 bg-surface px-4 text-sm shadow-sm focus-visible:border-primary/60">
								<SelectValue placeholder="Filter pembayaran" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Semua Metode</SelectItem>
								<SelectItem value="cash">Tunai</SelectItem>
								<SelectItem value="qris">QRIS</SelectItem>
								<SelectItem value="kasbon">Kasbon</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card className="rounded-xl border border-medium/70 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardHeader className="space-y-2 border-b border-medium/40 pb-6">
					<div className="flex items-center gap-2 text-sm font-medium text-primary">
						<span className="h-2 w-2 rounded-xl bg-primary" aria-hidden />
						Transaksi Hari Ini
					</div>
					<CardTitle className="text-2xl font-semibold text-primary">
						{filteredTransactions.length} transaksi ditemukan
					</CardTitle>
					<p className="text-sm text-secondary">
						Daftar transaksi yang sudah dibayar lengkap dengan pelanggan, metode, dan nilai total.
					</p>
				</CardHeader>
				<CardContent className="pt-6">
					{filteredTransactions.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-secondary">
							<BarChart3 className="h-10 w-10 text-muted" aria-hidden />
							<div>
								<p className="text-lg font-semibold text-primary">Belum ada transaksi</p>
								<p className="text-sm text-muted">Coba ulangi filter atau muat ulang data.</p>
							</div>
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-medium/40">
							<Table className="bg-white text-sm">
								<TableHeader className="bg-surface-secondary/70">
									<TableRow className="border-medium/40">
										<TableHead className="w-[220px] text-xs font-semibold uppercase tracking-widest text-secondary">Transaksi</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Pelanggan</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Metode</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Item</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Waktu</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredTransactions.map((transaction) => {
										const paymentMethod = transaction.paymentMethod as PaymentMethod
										const paymentInfo = paymentMeta[paymentMethod] ?? paymentMeta.cash
										return (
											<TableRow key={transaction.id} className="border-medium/30 transition hover:bg-surface-secondary/60">
												<TableCell className="font-mono text-xs text-secondary">
													<p className="text-sm font-semibold text-primary">{transaction.id}</p>
													<p className="text-xs text-muted">{transaction.status}</p>
												</TableCell>
												<TableCell>
													<p className="text-sm font-semibold text-primary">{transaction.customerName ?? "Walk-in"}</p>
													{transaction.customerDiscountPercent ? (
														<p className="text-xs text-success">Diskon {transaction.customerDiscountPercent}%</p>
													) : (
														<p className="text-xs text-muted">Tanpa membership</p>
													)}
												</TableCell>
												<TableCell>
													<span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${paymentInfo.badgeClass}`}>
														<span className={`h-1.5 w-1.5 rounded-full ${paymentInfo.accent}`} aria-hidden />
														{paymentInfo.label}
													</span>
												</TableCell>
												<TableCell className="text-sm font-semibold text-primary">{transaction.itemCount ?? 0}</TableCell>
												<TableCell>
													<div className="flex flex-col text-xs text-secondary">
														<span className="flex items-center gap-2 text-sm font-medium text-primary">
															<CalendarDays className="h-3.5 w-3.5 text-muted" aria-hidden />
															{formatDateLabel(transaction.createdAt)}
														</span>
														<span className="text-muted">{formatTimeLabel(transaction.createdAt)}</span>
													</div>
												</TableCell>
												<TableCell className="text-right text-sm font-semibold text-primary">
													{formatCurrency(Number(transaction.totalAmount ?? 0))}
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
