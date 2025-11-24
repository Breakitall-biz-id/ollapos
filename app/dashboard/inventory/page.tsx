'use client'

import { useEffect, useMemo, useState } from "react"
import { ArrowUpCircle, ClipboardList, Loader2, PackagePlus, Recycle } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getProductsForCurrentPangkalan, restockProductForCurrentPangkalan, type ProductListItem } from "@/lib/actions"
import { cn, formatCurrency } from "@/lib/utils"

type RestockTarget = ProductListItem & { index: number }

const NUMPAD_LAYOUT = [
	["1", "2", "3"],
	["4", "5", "6"],
	["7", "8", "9"],
	["C", "0", "⌫"],
]

const isReturnableProduct = (category: ProductListItem["category"]) =>
	category === "gas" || category === "water"

export default function InventoryPage() {
	const [products, setProducts] = useState<ProductListItem[]>([])
	const [loading, setLoading] = useState(true)
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [restockQuantity, setRestockQuantity] = useState("")
	const [restockNote, setRestockNote] = useState("")
	const [selectedProduct, setSelectedProduct] = useState<RestockTarget | null>(null)
	const [isSubmitting, setIsSubmitting] = useState(false)
	const selectedProductIsReturnable = selectedProduct ? isReturnableProduct(selectedProduct.category) : false

	useEffect(() => {
		const loadInventory = async () => {
			try {
				setLoading(true)
				const response = await getProductsForCurrentPangkalan()
				if (response.success && Array.isArray(response.data)) {
					setProducts(response.data)
				} else {
					toast.error(response.error ?? "Gagal memuat data stok")
				}
			} catch (error) {
				console.error("Failed to load inventory", error)
				toast.error("Terjadi kesalahan saat memuat data stok")
			} finally {
				setLoading(false)
			}
		}

		void loadInventory()
	}, [])

	const summary = useMemo(() => {
		return products.reduce(
			(acc, item) => {
				acc.totalFilled += item.stock
				if (isReturnableProduct(item.category)) {
					acc.totalEmpty += item.stockEmpty
				}
				acc.totalValue += item.basePrice * item.stock
				return acc
			},
			{
				totalFilled: 0,
				totalEmpty: 0,
				totalValue: 0,
			}
		)
	}, [products])

	const openRestockDialog = (product: ProductListItem, index: number) => {
		setSelectedProduct({ ...product, index })
		setRestockQuantity("")
		setRestockNote("")
		setIsDialogOpen(true)
	}

	const handleNumpadPress = (key: string) => {
		setRestockQuantity((prev) => {
			if (key === "C") {
				return ""
			}

			if (key === "⌫") {
				return prev.slice(0, -1)
			}

			if (prev.length >= 5) {
				return prev
			}

			if (key >= "0" && key <= "9") {
				if (key === "0" && prev === "") {
					return prev
				}
				return `${prev}${key}`
			}

			return prev
		})
	}

	const handleSubmit = async () => {
		if (!selectedProduct) return

		const quantity = Number.parseInt(restockQuantity, 10)
		if (!Number.isFinite(quantity) || quantity <= 0) {
			toast.error("Masukkan jumlah restock yang valid")
			return
		}

		setIsSubmitting(true)
		try {
			const response = await restockProductForCurrentPangkalan({
				productId: selectedProduct.id,
				quantity,
				note: restockNote,
			})

			if (!response.success || !response.data) {
				throw new Error(response.error ?? "Gagal melakukan restock")
			}

			setProducts((prev) => {
				const next = [...prev]
				const targetIndex = selectedProduct.index
				if (next[targetIndex] && next[targetIndex].id === response.data.productId) {
					next[targetIndex] = {
						...next[targetIndex],
						stock: response.data.stockFilled,
						stockEmpty: response.data.stockEmpty,
					}
				} else {
					const indexFallback = next.findIndex((item) => item.id === response.data.productId)
					if (indexFallback !== -1) {
						next[indexFallback] = {
							...next[indexFallback],
							stock: response.data.stockFilled,
							stockEmpty: response.data.stockEmpty,
						}
					}
				}
				return next
			})

			toast.success(`Stok ${selectedProduct.name} bertambah ${quantity} unit`)
			if (response.data.warning) {
				toast.warning(response.data.warning)
			}

			setIsDialogOpen(false)
			setSelectedProduct(null)

		} catch (error) {
			console.error("Restock failed", error)
			toast.error(error instanceof Error ? error.message : "Gagal melakukan restock")
		} finally {
			setIsSubmitting(false)
		}
	}

	if (loading) {
		return (
			<div className="flex h-[70vh] items-center justify-center">
				<div className="flex flex-col items-center gap-3 text-secondary">
					<Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
					<p className="text-base font-medium">Memuat data persediaan…</p>
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-8 px-6 pb-12">
			<div className="flex flex-wrap items-center justify-between gap-4 py-4">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-wider text-muted">Dashboard</p>
					<h1 className="text-3xl font-semibold text-primary">Manajemen Stok</h1>
					<p className="text-sm text-secondary">
						Catat kedatangan barang baru dan pantau stok kosong tanpa ribet.
					</p>
				</div>
				<Badge variant="secondary" className="rounded-full border border-medium/40 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
					Sinkron otomatis setelah transaksi
				</Badge>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="flex items-center justify-between gap-4 p-6">
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">Stok Isi</p>
							<p className="text-3xl font-semibold text-primary">{summary.totalFilled}</p>
						</div>
						<div className="rounded-xl bg-primary/10 p-3 text-primary">
							<ArrowUpCircle className="h-8 w-8" aria-hidden />
						</div>
					</CardContent>
				</Card>
				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="flex items-center justify-between gap-4 p-6">
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">Stok Kosong</p>
							<p className="text-3xl font-semibold text-primary">{summary.totalEmpty}</p>
						</div>
						<div className="rounded-xl bg-primary/10 p-3 text-primary">
							<Recycle className="h-8 w-8" aria-hidden />
						</div>
					</CardContent>
				</Card>
				<Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
					<CardContent className="flex items-center justify-between gap-4 p-6">
						<div className="space-y-1">
							<p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">Nilai Persediaan</p>
							<p className="text-3xl font-semibold text-primary">{formatCurrency(summary.totalValue)}</p>
						</div>
						<div className="rounded-xl bg-primary/10 p-3 text-primary">
							<ClipboardList className="h-8 w-8" aria-hidden />
						</div>
					</CardContent>
				</Card>
			</div>

			<Card className="rounded-xl border border-medium/70 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
				<CardHeader className="space-y-2 border-b border-medium/40 pb-6">
					<CardTitle className="text-2xl font-semibold text-primary">Daftar Produk</CardTitle>
					<p className="text-sm text-secondary">
						Gunakan tombol <span className="font-semibold text-primary">Barang Masuk</span> untuk menambah stok dan otomatis menyesuaikan jumlah stok kosong.
					</p>
				</CardHeader>
				<CardContent className="space-y-6 pt-6">
					{products.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-secondary">
							<PackagePlus className="h-10 w-10 text-muted" aria-hidden />
							<div>
								<p className="text-lg font-semibold text-primary">Belum ada produk yang tercatat</p>
								<p className="text-sm">Tambahkan produk terlebih dahulu pada menu Produk.</p>
							</div>
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-medium/40">
							<Table className="bg-white text-sm">
								<TableHeader className="bg-surface-secondary/70">
									<TableRow className="border-medium/40">
										<TableHead className="w-[280px] text-xs font-semibold uppercase tracking-widest text-secondary">Produk</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kategori</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Stok Isi</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Stok Kosong</TableHead>
										<TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Harga Dasar</TableHead>
										<TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Aksi</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{products.map((product, index) => (
										<TableRow key={product.id} className="border-medium/30 transition hover:bg-surface-secondary/60">
											<TableCell>
												<div className="space-y-1">
													<p className="text-sm font-semibold text-primary">{product.name}</p>
													{product.description && (
														<p className="text-xs text-muted">{product.description}</p>
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge
													className={cn(
														"border border-transparent px-3 py-1 text-xs font-semibold",
														product.category === "gas" && "bg-orange-50 text-orange-600",
														product.category === "water" && "bg-sky-50 text-sky-600",
														product.category === "general" && "bg-slate-100 text-slate-700"
													)}
												>
													{product.category === "gas"
														? "Gas LPG"
														: product.category === "water"
														? "Air Galon"
														: "Produk Lain"}
												</Badge>
											</TableCell>
											<TableCell>
												<span className={cn(
													"text-sm font-semibold",
													product.stock <= 5 ? "text-warning" : "text-primary"
												)}>
													{product.stock}
												</span>
											</TableCell>
											<TableCell>
												{isReturnableProduct(product.category) ? (
													<span
														className={cn(
															"text-sm font-semibold",
															product.stockEmpty <= 5 ? "text-warning" : "text-secondary"
														)}
													>
														{product.stockEmpty}
													</span>
												) : (
													<span className="text-sm font-medium text-muted">—</span>
												)}
											</TableCell>
											<TableCell className="font-semibold text-primary">{formatCurrency(product.basePrice)}</TableCell>
											<TableCell className="text-right">
												<Button
													className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
													onClick={() => openRestockDialog(product, index)}
												>
													Barang Masuk
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					if (!open && !isSubmitting) {
						setSelectedProduct(null)
					}
					setIsDialogOpen(open)
				}}
			>
				<DialogContent className="max-w-lg rounded-[24px] border border-medium/60 bg-white px-8 py-6">
					<DialogHeader className="space-y-3">
						<DialogTitle className="text-3xl font-semibold text-primary">Barang Masuk</DialogTitle>
						{selectedProduct && (
							<p className="text-sm text-secondary leading-relaxed">
								Tambahkan stok <strong>{selectedProduct.name}</strong>. {selectedProductIsReturnable
									? "Jumlah isi bertambah dan stok stok kosong menyesuaikan secara otomatis."
									: "Produk ini tidak memiliki stok kosong sehingga hanya menambah stok siap jual."}
							</p>
						)}
					</DialogHeader>

					<div className="space-y-4">
						<div className="rounded-xl border border-medium/50 bg-surface px-4 py-3 text-sm text-secondary">
							<div className="flex items-center justify-between">
								<span>Stok saat ini</span>
								<div className="flex items-center gap-3 text-base font-semibold text-primary">
									<span className="flex items-center gap-1">
										<ArrowUpCircle className="h-4 w-4" aria-hidden /> {selectedProduct?.stock ?? 0}
									</span>
									<Separator orientation="vertical" className="h-6" />
									<span className="flex items-center gap-1 text-secondary">
										<Recycle className="h-4 w-4" aria-hidden />
										{selectedProductIsReturnable ? selectedProduct?.stockEmpty ?? 0 : "—"}
									</span>
								</div>
							</div>
						</div>

						<div className="space-y-2">
							<p className="text-sm font-semibold text-secondary">Jumlah Masuk</p>
							<div className="rounded-xl border border-primary/40 bg-primary/5 p-4 text-center">
								<p className="text-4xl font-semibold tracking-wider text-primary">
									{restockQuantity || "0"}
								</p>
							</div>
							<div className="grid grid-cols-3 gap-3">
								{NUMPAD_LAYOUT.flat().map((key) => (
									<Button
										key={key}
										variant="outline"
										className="h-16 rounded-xl text-2xl font-semibold"
										onClick={() => handleNumpadPress(key)}
									>
										{key === "C" ? "Clear" : key === "⌫" ? "⌫" : key}
									</Button>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-semibold text-secondary" htmlFor="restock-note">
								Catatan (opsional)
							</label>
							<Input
								id="restock-note"
								placeholder="Contoh: Truk agen 12 Desember"
								value={restockNote}
								onChange={(event) => setRestockNote(event.target.value)}
							/>
						</div>
					</div>

					<DialogFooter className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
						<Button
							variant="outline"
							className="h-12 rounded-lg px-6 text-base"
							onClick={() => setIsDialogOpen(false)}
							disabled={isSubmitting}
						>
							Batal
						</Button>
						<Button
							className="h-12 rounded-lg px-6 text-base"
							onClick={handleSubmit}
							disabled={isSubmitting || !restockQuantity}
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
									Menyimpan…
								</>
							) : (
								"Simpan"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}


