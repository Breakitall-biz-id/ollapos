'use client'

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  Droplet,
  Flame,
  Loader2,
  MoreHorizontal,
  Package,
  Package2,
  Plus,
  Search,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
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
import { Separator } from "@/components/ui/separator"
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
      label: "Inactive",
      badgeClass: "bg-rose-50 text-rose-600 border border-rose-100",
      dotClass: "bg-rose-500",
    }
  }

  if (stock <= 5) {
    return {
      label: "Draft",
      badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
      dotClass: "bg-amber-500",
    }
  }

  return {
    label: "Published",
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
    stock: "",
    unit: "pcs",
    description: "",
  })

  useEffect(() => {
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

      const stockValue = Number.parseInt(formData.stock, 10)
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        toast.error("Stok produk tidak valid")
        return
      }

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        basePrice: basePriceValue,
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
      stock: "",
      unit: "pcs",
      description: "",
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">Memuat data produk…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Dashboard
          </p>
          <h1 className="text-3xl font-semibold text-primary">Manajemen Produk</h1>
          <p className="text-sm text-secondary">
            Pantau stok, atur harga, dan kelola produk untuk pangkalan Anda
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            resetForm()
          }
        }}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:bg-primary/90"
              onClick={() => {
                resetForm()
              }}
            >
              <Plus className="size-4" aria-hidden />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-[24px] border border-medium/50 bg-white px-8 py-6 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.65)]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-semibold text-primary">
                {editingProduct ? "Perbarui Produk" : "Tambah Produk Baru"}
              </DialogTitle>
              <p className="text-sm text-secondary leading-relaxed">
                Isi rincian produk dengan lengkap agar lebih mudah diidentifikasi oleh kasir.
              </p>
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
                  <Label htmlFor="basePrice" className="text-sm font-semibold text-primary">
                    Harga Dasar
                  </Label>
                  <Input
                    id="basePrice"
                    type="number"
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={formData.basePrice}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, basePrice: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-semibold text-primary">
                    Stok Saat Ini
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={formData.stock}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, stock: event.target.value }))
                    }
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
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 rounded-lg px-6 text-base"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  className="h-12 rounded-lg px-6 text-base"
                >
                  {editingProduct ? "Simpan Perubahan" : "Simpan Produk"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-xl border border-medium/60 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-2 border-b border-medium/40 pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="size-2 rounded-xl bg-primary" aria-hidden />
            Ringkasan Produk
          </div>
          <CardTitle className="text-2xl font-semibold text-primary">
            Most Popular Products
          </CardTitle>
          <p className="text-sm text-secondary">
            Daftar produk aktif berikut siap untuk diedit atau disesuaikan harganya kapan saja.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="w-full max-w-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari nama produk atau kategori"
                  className="h-12 rounded-lg border-medium/50 pl-11 pr-20 shadow-sm focus-visible:border-primary/60"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-medium/50 bg-surface px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
                  <kbd>⌘</kbd>
                  <span>K</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(categoryMeta) as CategoryFilter[]).map((key) => {
                const { label, icon: Icon } = categoryMeta[key]
                const count = categoryCounts[key] ?? 0
                return (
                  <Button
                    key={key}
                    type="button"
                    variant="outline"
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-transparent bg-surface px-4 py-2 text-sm font-medium text-secondary transition-all hover:border-primary/30 hover:bg-primary/5",
                      categoryFilter === key &&
                        "border-primary bg-primary/10 text-primary shadow-sm"
                    )}
                    onClick={() => setCategoryFilter(key)}
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                    <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-primary shadow-sm">
                      {count}
                    </span>
                  </Button>
                )
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-medium/40">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-secondary">
                <Package className="size-10 text-muted" aria-hidden />
                <div>
                  <p className="text-lg font-semibold text-primary">Tidak ada produk</p>
                  <p className="text-sm text-muted">
                    Coba ubah filter pencarian atau tambahkan produk baru.
                  </p>
                </div>
              </div>
            ) : (
              <Table className="bg-white text-sm">
                <TableHeader className="bg-surface-secondary/70">
                  <TableRow className="border-medium/40">
                    <TableHead className="w-[320px] text-xs font-semibold uppercase tracking-widest text-secondary">Product name</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Category</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">ID</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Price</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Created At</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Status</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = statusMeta(product.stock)
                    return (
                      <TableRow key={product.id} className="border-medium/30 transition hover:bg-surface-secondary/60">
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
                                    Global
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
            )}
          </div>
        </CardContent>
      </Card>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessingDelete) {
            setDeleteTarget(null)
          }
          setIsDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-medium/40 bg-white px-6 py-5 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.6)]">
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