"use client"

import { useEffect, useState, useCallback } from "react"
import { Check, Pencil, Percent, Tag, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NumericInput } from "@/components/ui/numeric-input"
import { PageLoadingState } from "@/components/page-loading-state"
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
import { TablePageHeader } from "@/components/table-page-header"
import { TableEmptyState } from "@/components/table-empty-state"
import { TableSectionCard } from "@/components/table-section-card"
import { formatCurrency } from "@/lib/utils"
import { getCustomerTypes, getProductsForCurrentPangkalan } from "@/lib/actions"
import {
	getProductTierPricings,
	upsertProductTierPricing,
	deleteProductTierPricing,
} from "@/lib/actions/product-tier-pricing"
import {
	resolveDiscountClient,
	type ProductTierPricingItem,
	type DiscountType,
} from "@/lib/discount-utils"

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

interface EditState {
	ruleId: string
	discountType: DiscountType
	discountValue: string
}

export default function PricingPage() {
	const [priceRules, setPriceRules] = useState<PriceRule[]>([])
	const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([])
	const [filteredRules, setFilteredRules] = useState<PriceRule[]>([])
	const [productTierPricings, setProductTierPricingsState] = useState<ProductTierPricingItem[]>([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState("")
	const [categoryFilter, setCategoryFilter] = useState<string>("all")
	const [typeFilter, setTypeFilter] = useState<string>("all")
	const [editState, setEditState] = useState<EditState | null>(null)
	const [saving, setSaving] = useState(false)

	const loadData = useCallback(async () => {
		try {
			const [productsResult, customerTypesResult, pricingsResult] = await Promise.all([
				getProductsForCurrentPangkalan(),
				getCustomerTypes(),
				getProductTierPricings(),
			])

			if (!productsResult.success || !productsResult.data) {
				throw new Error(productsResult.error ?? "Gagal memuat produk")
			}

			if (!customerTypesResult.success || !customerTypesResult.data) {
				throw new Error(customerTypesResult.error ?? "Gagal memuat tipe pelanggan")
			}

			const mappedRules: PriceRule[] = productsResult.data.flatMap((product: { id: string; name: string; category: 'gas' | 'water' | 'general'; basePrice: number }) => {
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

			if (pricingsResult.success && pricingsResult.data) {
				setProductTierPricingsState(pricingsResult.data as ProductTierPricingItem[])
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : "Gagal memuat data harga"
			toast.error(message)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void loadData()
	}, [loadData])

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

	const calculateFinalPrice = (basePrice: number, typeId: string, productId: string, productCategory: string) => {
		const customerType = customerTypes.find((type) => type.id === typeId)
		const globalDiscount = customerType?.discountPercent ?? 0

		const resolved = resolveDiscountClient(
			productId,
			typeId,
			basePrice,
			productCategory,
			productTierPricings,
			globalDiscount,
		)

		return {
			original: basePrice,
			finalPrice: resolved.finalPrice,
			discountAmount: resolved.discountAmount,
			source: resolved.source,
			type: resolved.type,
			value: resolved.value,
		}
	}

	const getExistingTierPricing = (productId: string, customerTypeId: string) => {
		return productTierPricings.find(
			p => p.productId === productId && p.customerTypeId === customerTypeId
		)
	}

	const startEdit = (rule: PriceRule) => {
		const existing = getExistingTierPricing(rule.productId, rule.typeId)
		setEditState({
			ruleId: rule.id,
			discountType: existing?.discountType ?? 'percentage',
			discountValue: existing ? String(existing.discountValue) : '',
		})
	}

	const cancelEdit = () => {
		setEditState(null)
	}

	const handleSave = async (rule: PriceRule) => {
		if (!editState) return

		const value = parseFloat(editState.discountValue)
		if (isNaN(value) || value < 0) {
			toast.error("Masukkan nilai diskon yang valid")
			return
		}

		if (editState.discountType === 'percentage' && value > 100) {
			toast.error("Diskon persentase tidak boleh lebih dari 100%")
			return
		}

		setSaving(true)
		try {
			const result = await upsertProductTierPricing(
				rule.productId,
				rule.typeId,
				editState.discountType,
				value
			)

			if (result.success) {
				toast.success("Diskon produk berhasil disimpan")
				// Reload pricings
				const pricingsResult = await getProductTierPricings()
				if (pricingsResult.success && pricingsResult.data) {
					setProductTierPricingsState(pricingsResult.data as ProductTierPricingItem[])
				}
				setEditState(null)
			} else {
				toast.error(result.error ?? "Gagal menyimpan diskon")
			}
		} catch {
			toast.error("Gagal menyimpan diskon")
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (rule: PriceRule) => {
		const existing = getExistingTierPricing(rule.productId, rule.typeId)
		if (!existing) return

		setSaving(true)
		try {
			const result = await deleteProductTierPricing(rule.productId, rule.typeId)
			if (result.success) {
				toast.success("Diskon khusus produk dihapus")
				const pricingsResult = await getProductTierPricings()
				if (pricingsResult.success && pricingsResult.data) {
					setProductTierPricingsState(pricingsResult.data as ProductTierPricingItem[])
				}
				setEditState(null)
			} else {
				toast.error(result.error ?? "Gagal menghapus diskon")
			}
		} catch {
			toast.error("Gagal menghapus diskon")
		} finally {
			setSaving(false)
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

	const getSourceBadge = (source: string, type: string, value: number) => {
		if (source === 'product_tier') {
			return (
				<Badge className="bg-violet-50 text-violet-700 border-violet-200 text-[11px]">
					{type === 'percentage' ? `${value}%` : formatCurrency(value)} • Khusus
				</Badge>
			)
		}
		if (source === 'global_tier') {
			return (
				<Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
					{value}% • Global
				</Badge>
			)
		}
		return <span className="text-xs text-muted">—</span>
	}

	if (loading) {
		return <PageLoadingState title="Memuat konfigurasi harga" />
	}

	return (
		<div className="table-page simple-page">
			<TablePageHeader
				title="Manajemen Harga"
				subtitle="Atur harga dasar dan diskon membership agar POS otomatis mengenali tarif khusus."
				searchValue={searchTerm}
				onSearchChange={setSearchTerm}
				searchPlaceholder="Cari produk atau tipe pelanggan"
			/>

			<div className="table-stat-strip table-help-card">
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

				<TableSectionCard
					controls={
						<>
							<Select value={categoryFilter} onValueChange={setCategoryFilter}>
								<SelectTrigger className="h-11 w-full rounded-lg border-medium/50 bg-surface px-4 text-sm shadow-sm focus-visible:border-primary/60 sm:w-[220px]">
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
								<SelectTrigger className="h-11 w-full rounded-lg border-medium/50 bg-surface px-4 text-sm shadow-sm focus-visible:border-primary/60 sm:w-[220px]">
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
						</>
					}
					isEmpty={filteredRules.length === 0}
					emptyState={
						<TableEmptyState
							title="Belum ada aturan harga"
							description="Tambahkan produk atau ubah filter pencarian."
							icon={Tag}
						/>
					}
					footer={
						<>
							<span>Menampilkan {filteredRules.length} aturan</span>
							<span>Harga terhitung otomatis</span>
						</>
					}
				>
					<Table className="bg-white text-sm">
						<TableHeader>
							<TableRow>
								<TableHead className="w-[280px] text-xs font-semibold uppercase tracking-widest text-secondary">Produk</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kategori</TableHead>
								<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Tipe Pelanggan</TableHead>
								<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Harga Dasar</TableHead>
								<TableHead className="text-center text-xs font-semibold uppercase tracking-widest text-secondary">Diskon</TableHead>
								<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Harga Final</TableHead>
								<TableHead className="text-center text-xs font-semibold uppercase tracking-widest text-secondary w-[120px]">Aksi</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredRules.map((rule) => {
								const pricing = calculateFinalPrice(rule.basePrice, rule.typeId, rule.productId, rule.productCategory)
								const isEditing = editState?.ruleId === rule.id
								const hasCustomDiscount = !!getExistingTierPricing(rule.productId, rule.typeId)

								return (
									<TableRow key={rule.id} className="transition">
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
										<TableCell className="text-center">
											{isEditing ? (
												<div className="flex items-center justify-center gap-1.5">
													<Select
														value={editState.discountType}
														onValueChange={(v) => setEditState({ ...editState, discountType: v as DiscountType })}
													>
														<SelectTrigger className="h-8 w-[80px] text-xs">
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="percentage">%</SelectItem>
															<SelectItem value="fixed">Rp</SelectItem>
														</SelectContent>
													</Select>
													<NumericInput
														value={editState.discountValue}
														onValueChange={(value) => setEditState({ ...editState, discountValue: value })}
														allowDecimal
														className="h-8 w-[80px] text-xs text-right"
														placeholder="Nilai"
													/>
												</div>
											) : (
												getSourceBadge(pricing.source, pricing.type, pricing.value)
											)}
										</TableCell>
										<TableCell className="text-right font-semibold text-primary">
											{isEditing ? (
												<span className="text-muted text-xs">—</span>
											) : (
												formatCurrency(pricing.finalPrice)
											)}
										</TableCell>
										<TableCell className="text-center">
											{isEditing ? (
												<div className="flex items-center justify-center gap-1">
													<Button
														size="icon"
														variant="ghost"
														className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
														onClick={() => handleSave(rule)}
														disabled={saving}
													>
														<Check className="h-3.5 w-3.5" />
													</Button>
													<Button
														size="icon"
														variant="ghost"
														className="h-7 w-7 text-muted hover:bg-slate-100"
														onClick={cancelEdit}
														disabled={saving}
													>
														<X className="h-3.5 w-3.5" />
													</Button>
												</div>
											) : (
												<div className="flex items-center justify-center gap-1">
													<Button
														size="icon"
														variant="ghost"
														className="h-7 w-7 text-secondary hover:bg-slate-100 hover:text-primary"
														onClick={() => startEdit(rule)}
													>
														<Pencil className="h-3.5 w-3.5" />
													</Button>
													{hasCustomDiscount && (
														<Button
															size="icon"
															variant="ghost"
															className="h-7 w-7 text-red-400 hover:bg-red-50 hover:text-red-600"
															onClick={() => handleDelete(rule)}
															disabled={saving}
														>
															<Trash2 className="h-3.5 w-3.5" />
														</Button>
													)}
												</div>
											)}
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</TableSectionCard>

			<Card className="table-control-card table-help-card">
				<CardHeader>
					<CardTitle className="text-2xl font-semibold text-primary">Cara Kerja Harga</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 md:grid-cols-2">
					{[
						{ title: "Harga Dasar", description: "Harga awal produk sebelum diskon. Berlaku untuk pelanggan reguler." },
						{ title: "Diskon Khusus Produk", description: "Atur diskon spesifik per produk dan tipe pelanggan (% atau nominal). Prioritas lebih tinggi dari diskon global." },
						{ title: "Diskon Global", description: "Persentase diskon default dari tipe pelanggan. Digunakan jika tidak ada diskon khusus." },
						{ title: "Semua Kategori Fleksibel", description: "Gas, air, dan produk umum semuanya bisa memakai diskon global maupun diskon khusus produk." },
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
