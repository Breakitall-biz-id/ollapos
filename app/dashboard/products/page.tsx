'use client'

import { useEffect, useMemo, useState, useRef } from "react"
import { useCachedData } from "@/lib/stores/data-cache"
import {
  CalendarDays,
  Droplet,
  Download,
  Flame,
  MoreHorizontal,
  Package,
  Package2,
  Plus,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { PageLoadingState } from "@/components/page-loading-state"
import { Separator } from "@/components/ui/separator"
import { TablePageHeader } from "@/components/table-page-header"
import { TableEmptyState } from "@/components/table-empty-state"
import { TableSectionCard } from "@/components/table-section-card"
import { cn, formatCurrency } from "@/lib/utils"
import {
  createProductForCurrentPangkalan,
  deleteProductForCurrentPangkalan,
  getProductsForCurrentPangkalan,
  updateProductForCurrentPangkalan,
} from "@/lib/actions"

type ProductsResponse = Awaited<ReturnType<typeof getProductsForCurrentPangkalan>>
type RawProduct = ProductsResponse["data"][number]

interface Product {
  id: string
  name: string
  category: "gas" | "water" | "general"
  basePrice: number
  costPrice: number
  stock: number
  unit: string
  imageUrl?: string | null
  description?: string | null
  createdAt?: string | null
  isGlobal: boolean
}

type CategoryFilter = "all" | "gas" | "water" | "general"

const categoryMeta: Record<CategoryFilter, { label: string; icon: React.ElementType }> = {
  all: { label: "Semua", icon: Package2 },
  gas: { label: "Gas LPG", icon: Flame },
  water: { label: "Air Galon", icon: Droplet },
  general: { label: "Umum", icon: Package },
}

const statusMeta = (stock: number) => {
  if (stock <= 0) {
    return {
      label: "Habis",
      badgeClass: "bg-rose-50 text-rose-600 border border-rose-100",
      dotClass: "bg-rose-500",
    }
  }

  if (stock <= 5) {
    return {
      label: "Menipis",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
      dotClass: "bg-amber-500",
    }
  }

  return {
    label: "Tersedia",
    badgeClass: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    dotClass: "bg-emerald-500",
  }
}

const createdAtLabel = (value?: string | null) => {
  if (!value) return "—"

  try {
    const date = new Date(value)
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    category: "gas" as "gas" | "water" | "general",
    basePrice: "",
    costPrice: "",
    stock: "",
    unit: "pcs",
    description: "",
  })

  const productsCache = useCachedData<Product[]>('products')
  const didInit = useRef(false)

  useEffect(() => {
    if (!didInit.current && productsCache.data && productsCache.isFresh) {
      didInit.current = true
      setProducts(productsCache.data)
      setFilteredProducts(productsCache.data)
      setLoading(false)
      return
    }
    didInit.current = true
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const result = await getProductsForCurrentPangkalan()
      if (result.success && result.data) {
        const mappedProducts: Product[] = result.data.map((entry: RawProduct) => {
          const basePrice = Number(entry.basePrice ?? 0)
          const stockValue = Number(entry.stock ?? 0)

          return {
            id: entry.id,
            name: entry.name,
            category: entry.category,
            basePrice: Number.isFinite(basePrice) ? basePrice : 0,
            costPrice: Number(entry.costPrice ?? 0),
            stock: Number.isFinite(stockValue) ? stockValue : 0,
            unit: entry.unit || "pcs",
            description: entry.description || "",
            imageUrl: entry.imageUrl || null,
            createdAt: entry.createdAt ?? null,
            isGlobal: entry.isGlobal ?? false,
          }
        })
        setProducts(mappedProducts)
        setFilteredProducts(mappedProducts)
        productsCache.setData(mappedProducts)
      }
    } catch (error) {
      console.error(error)
      toast.error("Gagal memuat produk")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let next = [...products]

    if (searchTerm) {
      next = next.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter !== "all") {
      next = next.filter((product) => product.category === categoryFilter)
    }

    setFilteredProducts(next)
  }, [products, searchTerm, categoryFilter])

  const categoryCounts = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc.all += 1
        acc[product.category] += 1
        return acc
      },
      {
        all: 0,
        gas: 0,
        water: 0,
        general: 0,
      } as Record<CategoryFilter, number>
    )
  }, [products])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const basePriceValue = Number(formData.basePrice)
      if (!Number.isFinite(basePriceValue) || basePriceValue < 0) {
        toast.error("Harga produk tidak valid")
        return
      }

      const costPriceValue = Number(formData.costPrice)
      if (!Number.isFinite(costPriceValue) || costPriceValue < 0) {
        toast.error("Harga beli tidak valid")
        return
      }

      if (costPriceValue > basePriceValue) {
        toast.error("Harga jual harus lebih tinggi daripada harga beli")
        return
      }

      const stockValue = Number.parseInt(formData.stock, 10)
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        toast.error("Stok produk tidak valid")
        return
      }

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        basePrice: basePriceValue,
        costPrice: costPriceValue,
        stock: stockValue,
        unit: formData.unit.trim() || "pcs",
        description: formData.description.trim(),
      }

      if (!payload.name) {
        toast.error("Nama produk wajib diisi")
        return
      }

      if (editingProduct) {
        const response = await updateProductForCurrentPangkalan(editingProduct.id, payload)
        if (!response.success) {
          throw new Error(response.error ?? "Gagal memperbarui produk")
        }
        toast.success("Produk berhasil diperbarui")
      } else {
        const response = await createProductForCurrentPangkalan(payload)
        if (!response.success) {
          throw new Error(response.error ?? "Gagal menambahkan produk")
        }
        toast.success("Produk berhasil ditambahkan")
      }

      await loadProducts()
      resetForm()
      setIsDialogOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan produk")
    }
  }

  const handleEdit = (product: Product) => {
    if (product.isGlobal) {
      toast.error("Produk global tidak dapat diedit dari dashboard ini")
      return
    }
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category,
      basePrice: product.basePrice.toString(),
      costPrice: product.costPrice.toString(),
      stock: product.stock.toString(),
      unit: product.unit,
      description: product.description || "",
    })
    setIsDialogOpen(true)
  }

  const handleDeleteRequest = (product: Product) => {
    if (product.isGlobal) {
      toast.error("Produk global tidak dapat dihapus")
      return
    }
    setDeleteTarget(product)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsProcessingDelete(true)

    try {
      const response = await deleteProductForCurrentPangkalan(deleteTarget.id)
      if (!response.success) {
        throw new Error(response.error ?? "Gagal menghapus produk")
      }
      toast.success("Produk berhasil dihapus")
      setIsDeleteDialogOpen(false)
      await loadProducts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus produk")
    } finally {
      setIsProcessingDelete(false)
      setDeleteTarget(null)
    }
  }

  const resetForm = () => {
    setEditingProduct(null)
    setFormData({
      name: "",
      category: "gas",
      basePrice: "",
      costPrice: "",
      stock: "",
      unit: "pcs",
      description: "",
    })
  }

  if (loading) {
    return <PageLoadingState title="Memuat data produk" />
  }

  return (
    <div className="table-page simple-page">
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open)
        if (!open) {
          resetForm()
        }
      }}>
        <TablePageHeader
          title="Manajemen Produk"
          subtitle="Pantau stok, atur harga, dan kelola produk untuk pangkalan Anda"
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari nama produk atau kategori"
          rightContent={
            <>
              <Button variant="outline" className="h-11 rounded-lg px-4 text-sm">
                <Download className="mr-2 h-4 w-4" aria-hidden />
                Export
              </Button>
              <DialogTrigger asChild>
                <Button
                  className="h-11 flex items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  onClick={() => {
                    resetForm()
                  }}
                >
                  <Plus className="size-4" aria-hidden />
                  Tambah Produk
                </Button>
              </DialogTrigger>
            </>
          }
        />
        <DialogContent className="max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">
              {editingProduct ? "Perbarui Produk" : "Tambah Produk Baru"}
            </DialogTitle>
            <DialogDescription className="text-sm text-secondary leading-relaxed">
              Isi rincian produk dengan lengkap agar lebih mudah diidentifikasi oleh kasir.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-primary">
                  Nama Produk
                </Label>
                <Input
                  id="name"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, name: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-semibold text-primary">
                  Kategori
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value: "gas" | "water" | "general") =>
                    setFormData((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger
                    id="category"
                    className="h-12 w-full rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  >
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gas">Gas LPG</SelectItem>
                    <SelectItem value="water">Air Galon</SelectItem>
                    <SelectItem value="general">Umum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="costPrice" className="text-sm font-semibold text-primary">
                  Harga Beli / Modal
                </Label>
                <NumericInput
                  id="costPrice"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.costPrice}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, costPrice: value }))}
                  required
                />
                <p className="text-xs text-secondary">Modal per unit digunakan sebagai dasar perhitungan profit.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="basePrice" className="text-sm font-semibold text-primary">
                  Harga Jual (per unit)
                </Label>
                <NumericInput
                  id="basePrice"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.basePrice}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, basePrice: value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock" className="text-sm font-semibold text-primary">
                  Stok Saat Ini
                </Label>
                <NumericInput
                  id="stock"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.stock}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, stock: value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit" className="text-sm font-semibold text-primary">
                  Satuan Penjualan
                </Label>
                <Input
                  id="unit"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.unit}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, unit: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-sm font-semibold text-primary">
                    Deskripsi
                  </Label>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
                    Opsional
                  </span>
                </div>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Catatan tambahan mengenai produk (opsional)"
                  className="min-h-28 rounded-lg border-medium/40 bg-surface px-4 py-3 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.description}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
            </div>
            <Separator className="hidden md:block" />
            <DialogFooter className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
                onClick={() => setIsDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="brand"
                className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
              >
                {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TableSectionCard
        controls={
          <>
            {(Object.keys(categoryMeta) as CategoryFilter[]).map((key) => {
              const { label, icon: Icon } = categoryMeta[key]
              const count = categoryCounts[key] ?? 0
              return (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-all",
                    categoryFilter === key
                      ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
                  )}
                  onClick={() => setCategoryFilter(key)}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px]",
                      categoryFilter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </>
        }
        isEmpty={filteredProducts.length === 0}
        emptyState={
          <TableEmptyState
            title="Tidak ada produk"
            description="Coba ubah filter pencarian atau tambahkan produk baru."
            icon={Package}
          />
        }
        footer={
          <>
            <span>Menampilkan {filteredProducts.length} produk</span>
            <span>Data terbaru</span>
          </>
        }
        footerClassName="hidden md:flex"
      >
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {filteredProducts.map((product) => {
              const status = statusMeta(product.stock)
              return (
                <div key={`mobile-${product.id}`} className="space-y-3 rounded-xl border border-medium/40 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-primary">{product.name}</p>
                      <p className="text-sm text-secondary">{categoryMeta[product.category].label}</p>
                    </div>
                    <Badge className={cn("border px-2.5 py-1 text-xs font-semibold", status.badgeClass)}>
                      {status.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted">Harga</p>
                      <p className="font-semibold text-primary">{formatCurrency(product.basePrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Stok</p>
                      <p className="font-semibold text-primary">{product.stock} {product.unit}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted">Tanggal</p>
                      <p className="text-secondary">{createdAtLabel(product.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg"
                      disabled={product.isGlobal}
                      onClick={() => handleEdit(product)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 rounded-lg text-destructive hover:text-destructive"
                      disabled={product.isGlobal}
                      onClick={() => handleDeleteRequest(product)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>

          <Table className="hidden bg-white text-sm md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px] text-xs font-semibold uppercase tracking-widest text-secondary">Nama produk</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kategori</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">ID</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Harga</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Tanggal</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Status</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = statusMeta(product.stock)
                return (
                  <TableRow key={product.id} className="transition">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-11 rounded-xl border border-medium/40 bg-surface">
                          {product.imageUrl ? (
                            <AvatarImage src={product.imageUrl} alt={product.name} />
                          ) : (
                            <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
                              {product.name
                                .split(" ")
                                .slice(0, 2)
                                .map((word) => word.charAt(0))
                                .join("")}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-primary">{product.name}</p>
                          {product.description && (
                            <p className="text-xs text-muted">{product.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                            <Badge className="border border-primary/20 bg-primary/10 text-primary">
                              Stok {product.stock}
                            </Badge>
                            <span>{product.unit}</span>
                            {product.isGlobal && (
                              <span className="rounded-lg border border-medium/50 bg-surface-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-widest text-secondary">
                                Bawaan Sistem
                              </span>
                            )}
                          </div>
                        </div>
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
                        {categoryMeta[product.category].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-secondary">{product.id}</TableCell>
                    <TableCell className="font-semibold text-primary">
                      {formatCurrency(product.basePrice)}
                    </TableCell>
                    <TableCell className="text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-3.5 text-muted" aria-hidden />
                        {createdAtLabel(product.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-lg px-3 py-1 text-xs font-semibold",
                          status.badgeClass
                        )}
                      >
                        <span className={cn("size-2 rounded-lg", status.dotClass)} aria-hidden />
                        {status.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9 rounded-lg border border-transparent hover:border-primary/30 hover:bg-primary/10"
                            aria-label={`Aksi untuk ${product.name}`}
                          >
                            <MoreHorizontal className="size-4" aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl border border-medium/50 bg-white shadow-lg">
                          <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-widest text-secondary">
                            Aksi Produk
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-medium/30" />
                          <DropdownMenuItem
                            disabled={product.isGlobal}
                            onClick={() => handleEdit(product)}
                          >
                            Edit Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            disabled={product.isGlobal}
                            onClick={() => handleDeleteRequest(product)}
                          >
                            Hapus Produk
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </>
      </TableSectionCard>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessingDelete) {
            setDeleteTarget(null)
          }
          setIsDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-2xl font-semibold text-primary">
              Konfirmasi Hapus Produk
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-secondary">
              {deleteTarget ? (
                <span>
                  Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>? Tindakan ini
                  tidak dapat dibatalkan dan produk akan hilang dari daftar.
                </span>
              ) : (
                "Apakah Anda yakin ingin menghapus produk ini?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AlertDialogCancel
              disabled={isProcessingDelete}
              className="h-11 rounded-lg border-medium/40 px-5 text-sm"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isProcessingDelete}
              className="h-11 rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessingDelete ? "Menghapus..." : "Hapus Produk"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
