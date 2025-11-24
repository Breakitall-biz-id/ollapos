"use client"

import { useEffect, useState } from "react"
import { Percent, Search, Tag } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import { formatCurrency } from "@/lib/utils"
import { getCustomerTypes, getProductsForCurrentPangkalan } from "@/lib/actions"

interface PriceRule {
	id: string
	productId: string
	productName: string
	productCategory: "gas" | "water" | "general"
	typeId: string
	typeName: string
	basePrice: number
}

interface CustomerType {
	id: string
	name: string
	displayName: string
	discountPercent: number
}

export default function PricingPage() {
	const [priceRules, setPriceRules] = useState<PriceRule[]>([])
	const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([])
	const [filteredRules, setFilteredRules] = useState<PriceRule[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [categoryFilter, setCategoryFilter] = useState<string>("all")
	const [typeFilter, setTypeFilter] = useState<string>("all")

	useEffect(() => {
		void loadData()
	}, [])

	const loadData = async () => {
		try {
			const [productsResult, customerTypesResult] = await Promise.all([
				getProductsForCurrentPangkalan(),
				getCustomerTypes(),
			])

			if (!productsResult.success || !productsResult.data) {
				throw new Error(productsResult.error ?? "Gagal memuat produk")
			}

			if (!customerTypesResult.success || !customerTypesResult.data) {
				throw new Error(customerTypesResult.error ?? "Gagal memuat tipe pelanggan")
			}

			const mappedRules: PriceRule[] = productsResult.data.flatMap((product: any) => {
				return customerTypesResult.data!.map((type: CustomerType) => ({
					id: `${product.id}-${type.id}`,
					productId: product.id,
					productName: product.name,
					productCategory: product.category,
					typeId: type.id,
					typeName: type.displayName,
					basePrice: Number(product.basePrice ?? 0),
				}))
			})

			setPriceRules(mappedRules)
			setFilteredRules(mappedRules)
			setCustomerTypes(customerTypesResult.data)
		} catch (error) {
			const message = error instanceof Error ? error.message : "Gagal memuat data harga"
			toast.error(message)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		let filtered = [...priceRules]

		if (searchTerm) {
			filtered = filtered.filter(
				(rule) =>
					rule.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
					rule.typeName.toLowerCase().includes(searchTerm.toLowerCase())
			)
		}

		if (categoryFilter !== "all") {
			filtered = filtered.filter((rule) => rule.productCategory === categoryFilter)
		}

		if (typeFilter !== "all") {
			filtered = filtered.filter((rule) => rule.typeId === typeFilter)
		}

		setFilteredRules(filtered)
	}, [priceRules, searchTerm, categoryFilter, typeFilter])

	const calculateFinalPrice = (basePrice: number, typeId: string) => {
		const customerType = customerTypes.find((type) => type.id === typeId)
		const discountPercent = customerType?.discountPercent ?? 0
		const discountedPrice = basePrice * (1 - discountPercent / 100)

		return {
			original: basePrice,
			discount: discountPercent,
			final: Math.round(discountedPrice),
			savings: Math.round(basePrice - discountedPrice),
		}
	}

	const getCategoryColor = (category: string) => {
		switch (category) {
			case "gas":
				return "bg-orange-50 text-orange-600"
			case "water":
				return "bg-sky-50 text-sky-600"
			default:
				return "bg-slate-100 text-slate-700"
		}
	}

	const getCategoryLabel = (category: string) => {
		switch (category) {
			case "gas":
				return "Gas LPG"
			case "water":
				return "Air Minum"
			default:
				return "Umum"
		}
	}

	if (loading) {
		return (
			<div className="flex min-h-[420px] items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-secondary">
					<Tag className="h-6 w-6 animate-spin text-primary" aria-hidden />
					<p className="text-base font-medium">Memuat konfigurasi harga…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8 px-6 pb-12">
			<div className="flex flex-wrap items-center justify-between gap-4 py-4">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted">Dashboard</p>
					<h1 className="text-3xl font-semibold text-primary">Manajemen Harga</h1>
					<p className="text-sm text-secondary">
						Atur harga dasar dan diskon membership agar POS otomatis mengenali tarif khusus.
					</p>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-4">
				{customerTypes.map((type) => (
					<Card key={type.id} className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
						<CardContent className="flex items-center justify-between gap-4 p-6">
							<div className="space-y-1">
								<p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">{type.displayName}</p>
								<div className="flex items-center gap-2 text-3xl font-semibold text-primary">
									<Percent className="h-5 w-5" aria-hidden />
									{type.discountPercent}
								</div>
							</div>
							<Badge
								variant={type.discountPercent > 0 ? "default" : "secondary"}
								className="rounded-full border border-medium/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
							>
								{type.discountPercent > 0 ? "Diskon" : "Reguler"}
							</Badge>
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardContent className="space-y-4 p-6">
					<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
						<div className="w-full max-w-xl">
							<div className="relative">
								<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
								<Input
									placeholder="Cari produk atau tipe pelanggan"
									value={searchTerm}
									onChange={(event) => setSearchTerm(event.target.value)}
									className="h-12 rounded-lg border-medium/50 pl-11 pr-4 shadow-sm focus-visible:border-primary/60"
								/>
							</div>
						</div>
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="h-12 w-full rounded-lg border-medium/50 bg-surface px-4 text-sm shadow-sm focus-visible:border-primary/60">
								<SelectValue placeholder="Filter Kategori" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Semua Kategori</SelectItem>
								<SelectItem value="gas">Gas LPG</SelectItem>
								<SelectItem value="water">Air Minum</SelectItem>
								<SelectItem value="general">Umum</SelectItem>
							</SelectContent>
						</Select>
						<Select value={typeFilter} onValueChange={setTypeFilter}>
							<SelectTrigger className="h-12 w-full rounded-lg border-medium/50 bg-surface px-4 text-sm shadow-sm focus-visible:border-primary/60">
								<SelectValue placeholder="Filter Tipe" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Semua Tipe</SelectItem>
								{customerTypes.map((type) => (
									<SelectItem key={type.id} value={type.id}>
										{type.displayName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</CardContent>
			</Card>

			<Card className="rounded-xl border border-medium/70 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardHeader className="space-y-2 border-b border-medium/40 pb-6">
					<div className="flex items-center gap-2 text-sm font-medium text-primary">
						<span className="h-2 w-2 rounded-xl bg-primary" aria-hidden />
						Matriks Harga
					</div>
					<CardTitle className="text-2xl font-semibold text-primary">{filteredRules.length} Aturan Aktif</CardTitle>
					<p className="text-sm text-secondary">
						Kombinasi produk dan tipe pelanggan otomatis menghitung harga final di kasir.
					</p>
				</CardHeader>
				<CardContent className="pt-6">
					{filteredRules.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-secondary">
							<Tag className="h-10 w-10 text-muted" aria-hidden />
							<div>
								<p className="text-lg font-semibold text-primary">Belum ada aturan harga</p>
								<p className="text-sm text-muted">Tambahkan produk atau ubah filter pencarian.</p>
							</div>
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-medium/40">
							<Table className="bg-white text-sm">
								<TableHeader className="bg-surface-secondary/70">
									<TableRow className="border-medium/40">
										<TableHead className="w-[320px] text-xs font-semibold uppercase tracking-widest text-secondary">Produk</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kategori</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Tipe Pelanggan</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Harga Dasar</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Diskon</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Harga Final</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Hemat</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{filteredRules.map((rule) => {
										const pricing = calculateFinalPrice(rule.basePrice, rule.typeId)
										return (
											<TableRow key={rule.id} className="border-medium/30 transition hover:bg-surface-secondary/60">
												<TableCell>
													<p className="text-sm font-semibold text-primary">{rule.productName}</p>
													<p className="text-xs text-muted">ID: {rule.productId}</p>
												</TableCell>
												<TableCell>
													<Badge className={getCategoryColor(rule.productCategory)}>
														{getCategoryLabel(rule.productCategory)}
													</Badge>
												</TableCell>
												<TableCell>
													<Badge variant="outline">{rule.typeName}</Badge>
												</TableCell>
												<TableCell className="text-right font-semibold text-primary">
													{formatCurrency(pricing.original)}
												</TableCell>
												<TableCell className="text-right">
													{pricing.discount > 0 ? (
														<span className="text-sm font-semibold text-success">{pricing.discount}%</span>
													) : (
														<span className="text-xs text-muted">—</span>
													)}
												</TableCell>
												<TableCell className="text-right font-semibold text-primary">
													{formatCurrency(pricing.final)}
												</TableCell>
												<TableCell className="text-right">
													{pricing.savings > 0 ? (
														<span className="text-sm font-semibold text-success">- {formatCurrency(pricing.savings)}</span>
													) : (
														<span className="text-xs text-muted">—</span>
													)}
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

			<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold text-primary">Cara Kerja Harga</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					{[
						{ title: "Harga Dasar", description: "Harga awal produk sebelum diskon. Berlaku untuk pelanggan reguler." },
						{ title: "Diskon Otomatis", description: "Persentase diskon mengikuti tipe pelanggan dan otomatis diterapkan di POS." },
						{ title: "Harga Final", description: "Nilai yang dibayar pelanggan setelah diskon dan pembulatan otomatis." },
						{ title: "Update Real-time", description: "Perubahan langsung tersinkron ke kasir setelah disimpan." },
					].map((item) => (
						<div key={item.title} className="rounded-xl border border-medium/40 bg-surface px-4 py-5">
							<h4 className="text-base font-semibold text-primary">{item.title}</h4>
							<p className="text-sm text-secondary">{item.description}</p>
						</div>
					))}
				</CardContent>
			</Card>
		</div>
	)
}
