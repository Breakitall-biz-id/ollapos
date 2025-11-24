"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  DollarSign,
  Droplet,
  FileText,
  Flame,
  Loader2,
  Package,
  QrCode,
  Search,
  ShoppingCart,
  Users,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CartItemRow } from "@/components/pos/CartItemRow"
import { CategoryOption, CategoryTabs } from "@/components/pos/CategoryTabs"
import { ProductCard, type DisplayProduct } from "@/components/pos/ProductCard"
import { ReceiptModal } from "@/components/pos/ReceiptModal"
import { SalesSummary } from "@/components/pos/SalesSummary"
import { getCustomersForCurrentPangkalan } from "@/lib/actions/customers"
import { getProductsForCurrentPangkalan } from "@/lib/actions/products"
import { createTransaction } from "@/lib/actions/transactions"
import { useCartStore } from "@/lib/stores/cart-store"
import { formatCurrency } from "@/lib/utils"

// Types
interface Product {
  id: string
  name: string
  category: "gas" | "water" | "general"
  basePrice: number
  stock: number
  stockEmpty: number
  imageUrl?: string
}

interface Customer {
  id: string
  name: string
  phone?: string
  typeId: string
  typeName: string
  displayName: string
  discountPercent: number
  color: string
  totalSpent: number
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { id: "gas", label: "Gas LPG", icon: Flame },
  { id: "water", label: "Air Galon", icon: Droplet },
  { id: "general", label: "Umum", icon: Package },
]

type ReceiptData = {
  id: string
  items: Array<{ name: string; quantity: number; price: number; subtotal: number }>
  total: number
  paymentMethod: "cash" | "qris" | "kasbon"
  cashReceived?: number
  changeAmount?: number
  customerName?: string
  createdAt: Date
}

type RawProduct = {
  id: string
  name: string
  category?: string | null
  basePrice: string | number
  stock?: string | number | null
  stockEmpty?: string | number | null
  imageUrl?: string | null
}

type RawCustomer = {
  id: string
  name: string
  typeId: string
  typeName?: string | null
  displayName?: string | null
  phone?: string | null
  discountPercent?: string | number | null
  color?: string | null
  totalSpent?: string | number | null
}

export function POSInterface() {
  const [activeCategory, setActiveCategory] = useState<Product["category"]>("gas")
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isCustomerDialogOpen, setCustomerDialogOpen] = useState(false)
  const [isPaymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "qris" | "kasbon">("cash")
  const [cashReceivedInput, setCashReceivedInput] = useState("")
  const [isProcessingPayment, setProcessingPayment] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [isReceiptOpen, setReceiptOpen] = useState(false)

  const cartStore = useCartStore()
  const {
    items,
    total,
    itemCount,
    customerId,
    customerName,
    customerDiscountPercent,
    addItem,
    removeItem,
    updateQuantity,
    setCustomer,
    clearCart,
  } = cartStore

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsResult, customersResult] = await Promise.all([
        getProductsForCurrentPangkalan(),
        getCustomersForCurrentPangkalan(),
      ])

      if (productsResult.success && Array.isArray(productsResult.data)) {
        const rawProducts = productsResult.data as RawProduct[]
        setProducts(
          rawProducts.map((product) => {
            const category =
              product.category === "gas" || product.category === "water"
                ? product.category
                : "general"

            return {
              id: product.id,
              name: product.name,
              category,
              basePrice: Number(product.basePrice ?? 0),
              stock: Number(product.stock ?? 0),
              stockEmpty: Number(product.stockEmpty ?? 0),
              imageUrl: product.imageUrl ?? undefined,
            }
          })
        )
      }

      if (customersResult.success && Array.isArray(customersResult.data)) {
        const rawCustomers = customersResult.data as RawCustomer[]
        setCustomers(
          rawCustomers.map((customer) => ({
            id: customer.id,
            name: customer.name,
            typeId: customer.typeId,
            typeName: customer.typeName ?? customer.displayName ?? "Regular",
            displayName: customer.displayName ?? customer.typeName ?? "Regular",
            phone: customer.phone ?? undefined,
            discountPercent: Number(customer.discountPercent ?? 0),
            color: customer.color ?? "#2563EB",
            totalSpent: Number(customer.totalSpent ?? 0),
          }))
        )
      }
    } catch (error) {
      console.error("Error loading POS data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const categoryCounts = useMemo(() => {
    return products.reduce(
      (acc, product) => {
        acc[product.category] += 1
        return acc
      },
      { gas: 0, water: 0, general: 0 } as Record<Product["category"], number>
    )
  }, [products])

  const productCards: DisplayProduct[] = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return products
      .filter((product) => product.category === activeCategory)
      .filter((product) =>
        query.length === 0 ? true : product.name.toLowerCase().includes(query)
      )
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        price: Math.round(product.basePrice * (1 - customerDiscountPercent / 100)),
        stock: product.stock,
        imageUrl: product.imageUrl,
      }))
  }, [products, activeCategory, searchTerm, customerDiscountPercent])

  const totalSavings = useMemo(
    () =>
      items.reduce((sum, item) => {
        const discount = Math.max(0, item.basePrice - item.discountedPrice)
        return sum + discount * item.quantity
      }, 0),
    [items]
  )

  const cashReceivedAmount = Number.parseInt(cashReceivedInput || "0", 10) || 0
  const changeAmount = Math.max(0, cashReceivedAmount - total)
  const isCashShort = selectedPaymentMethod === "cash" && cashReceivedAmount < total

  const quickCashOptions = useMemo(() => {
    const presets = [20000, 50000, 100000, 200000, 500000]
    const uniqueValues = new Set<number>([total, ...presets])
    return Array.from(uniqueValues)
      .filter((amount) => amount > 0)
      .sort((a, b) => a - b)
      .slice(0, 6)
  }, [total])

  const handleAddToCart = (productId: string) => {
    const product = products.find((item) => item.id === productId)
    if (!product) {
      return
    }

    // Use cart store's stock validation
    const success = addItem({
      id: product.id,
      name: product.name,
      category: product.category,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl,
    }, product.stock)

    if (!success) {
      const cartItem = items.find((item) => item.productId === productId)
      const currentCartQuantity = cartItem ? cartItem.quantity : 0
      alert(`❌ Stok tidak mencukupi! Stok tersedia: ${product.stock}, diminta: ${currentCartQuantity + 1}`)
    }
  }

  const handleAdjustQuantity = (productId: string) => {
    const cartItem = items.find((item) => item.productId === productId)
    if (cartItem) {
      updateQuantity(productId, cartItem.quantity + 1)
    } else {
      handleAddToCart(productId)
    }
  }

  const handleSelectCustomer = (customer?: Customer) => {
    if (!customer) {
      setCustomer(undefined, undefined, undefined, undefined, 0)
    } else {
      setCustomer(
        customer.id,
        customer.name,
        customer.typeId,
        customer.displayName,
        customer.discountPercent
      )
    }
    setCustomerDialogOpen(false)
  }

  const handleProcessPayment = async () => {
    if (!items.length) return

    // Validate stock before processing payment
    const stockValidation = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)
      return {
        productName: item.name,
        requested: item.quantity,
        available: product?.stock || 0,
        isValid: product ? item.quantity <= product.stock : false
      }
    })

    const invalidItems = stockValidation.filter((item) => !item.isValid)
    if (invalidItems.length > 0) {
      const errorMessage = invalidItems
        .map((item) => `${item.productName}: ${item.requested} diminta, ${item.available} tersedia`)
        .join("\n")
      alert(`❌ Stok tidak mencukupi untuk beberapa item:\n${errorMessage}\n\nSilakan perbarui keranjang Anda.`)
      return
    }

    const payload = {
      customerId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.discountedPrice,
        subtotal: item.subtotal,
      })),
      paymentMethod: selectedPaymentMethod,
      cashReceived:
        selectedPaymentMethod === "cash" ? cashReceivedAmount : undefined,
    }

    setProcessingPayment(true)
    try {
      const result = await createTransaction(payload)
      if (result.success && result.data) {
        const normalizedTotal = Number(result.data.total ?? total)
        const normalizedChange =
          result.data.changeAmount !== undefined && result.data.changeAmount !== null
            ? Number(result.data.changeAmount)
            : selectedPaymentMethod === "cash"
              ? Math.max(0, cashReceivedAmount - normalizedTotal)
              : undefined

        const receipt: ReceiptData = {
          id: result.data.id,
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.discountedPrice,
            subtotal: item.subtotal,
          })),
          total: normalizedTotal,
          paymentMethod: selectedPaymentMethod,
          cashReceived:
            selectedPaymentMethod === "cash" ? cashReceivedAmount : undefined,
          changeAmount: normalizedChange,
          customerName: customerName || undefined,
          createdAt: new Date(result.data.createdAt),
        }

        setReceiptData(receipt)
        setReceiptOpen(true)
        clearCart()
        setPaymentDialogOpen(false)
        setCashReceivedInput("")
        setSelectedPaymentMethod("cash")

        // Refresh data to update stock and sales summary
        await loadData()
      } else {
        alert(`❌ Gagal memproses pembayaran: ${result.error}`)
      }
    } catch (error) {
      console.error("Payment processing error", error)
      alert("❌ Terjadi kesalahan saat memproses pembayaran")
    } finally {
      setProcessingPayment(false)
    }
  }

  const canSubmitPayment = useMemo(() => {
    if (!items.length || isProcessingPayment) {
      return false
    }

    if (selectedPaymentMethod === "cash") {
      return cashReceivedAmount >= total && total > 0
    }

    if (selectedPaymentMethod === "kasbon") {
      return Boolean(customerId)
    }

    return true
  }, [
    items.length,
    isProcessingPayment,
    selectedPaymentMethod,
    cashReceivedAmount,
    total,
    customerId,
  ])

  if (loading) {
    return (
      <div className="flex min-h-screen text items-center justify-center bg-surface-secondary">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" aria-hidden />
          <h2 className="text-2xl font-semibold text-primary">Memuat POS</h2>
          <p className="text-secondary">Mohon tunggu sesaat…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#F5F7FB] px-4 py-6 text-primary sm:px-6 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white to-[#F2F4FF] p-6 shadow-[0_40px_120px_-80px_rgba(15,23,42,0.8)] sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">Kasir</p>
                <h1 className="text-3xl font-semibold leading-tight text-primary lg:text-4xl">Ollapos</h1>
     
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  Mode Kasir Aktif
                </Badge>
                <Button variant="outline" className="rounded-full border-medium/50 bg-white px-5" onClick={() => { void loadData() }}>
                  Sinkron data
                </Button>
              </div>
            </div>
              <div className="mt-8">
              <SalesSummary inline />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Cari produk atau ketikkan kata kunci"
                  className="h-12 rounded-2xl border-medium/40 bg-white pl-11 text-base"
                />
              </div>
              <Button
                className="h-12 rounded-2xl px-6 text-base font-semibold shadow-sm"
                variant="secondary"
                onClick={() => setPaymentDialogOpen(true)}
                disabled={!items.length}
              >
                Lihat Pembayaran
              </Button>
            </div>
     
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
            <section className="flex w-full flex-1 flex-col gap-6">
              <Card className="flex flex-1 flex-col rounded-[32px] border border-medium/40 bg-white shadow-[0_40px_120px_-90px_rgba(15,23,42,0.85)]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-primary">Katalog Produk</CardTitle>
                  <p className="text-sm text-secondary">
                    Ketuk kartu produk untuk menambah ke keranjang, atau pilih kategori di bawah ini.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-6 overflow-hidden">
                  <CategoryTabs
                    categories={CATEGORY_OPTIONS}
                    activeCategory={activeCategory}
                    onCategoryChange={(category) => setActiveCategory(category)}
                    counts={categoryCounts}
                  />
                  <Separator className="bg-medium/30" />
                  {productCards.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-medium/40 bg-surface-tertiary/80 p-8 text-center text-secondary">
                      <Package className="mb-4 h-12 w-12 text-muted" aria-hidden />
                      <p className="text-base font-semibold text-primary">Tidak ada produk pada kategori ini</p>
                      <p className="text-sm">Coba pilih kategori lain atau hapus pencarian</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[60vh] pr-4">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-2">
                        {productCards.map((product) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            quantityInCart={items.find((item) => item.productId === product.id)?.quantity || 0}
                            onAddToCart={handleAddToCart}
                            onAdjustQuantity={handleAdjustQuantity}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </section>

            <aside className="flex w-full flex-col gap-6">

              <Card className="flex flex-1 flex-col rounded-[32px] border border-medium/40 bg-white shadow-[0_40px_120px_-90px_rgba(15,23,42,0.85)]">
                <CardHeader className="flex items-start justify-between gap-3 pb-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-primary">Keranjang</CardTitle>
                    <p className="text-sm text-secondary">{itemCount} item dipilih</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearCart}
                    disabled={!items.length}
                    className="rounded-full border-medium/50"
                  >
                    Kosongkan
                  </Button>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden">
                  <div className="rounded-2xl border border-medium/40 bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Pelanggan aktif</p>
                        <p className="text-lg font-semibold text-primary">{customerName ?? "Tamu Umum"}</p>
                        {customerDiscountPercent > 0 && (
                          <p className="text-sm text-success">Diskon otomatis {customerDiscountPercent}%</p>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => setCustomerDialogOpen(true)}
                      >
                        {customerName ? "Ganti" : "Pilih"}
                      </Button>
                    </div>
                  </div>

                  {items.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-medium/40 bg-surface-tertiary/80 p-6 text-center text-secondary">
                      <ShoppingCart className="mb-3 h-12 w-12 text-muted" aria-hidden />
                      <p className="text-base font-medium text-primary">Keranjang masih kosong</p>
                      <p className="text-sm">Pilih produk di panel kiri untuk memulai transaksi</p>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 pr-3">
                      <div className="space-y-3 pb-2">
                        {items.map((item) => (
                          <CartItemRow
                            key={item.id}
                            item={item}
                            onDecrease={(productId) => updateQuantity(productId, item.quantity - 1)}
                            onIncrease={(productId) => updateQuantity(productId, item.quantity + 1)}
                            onRemove={removeItem}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  <div className="space-y-2 rounded-2xl border border-medium/40 bg-surface-tertiary/80 p-4 text-sm">
                    <div className="flex items-center justify-between text-secondary">
                      <span>Subtotal</span>
                      <span className="font-medium text-primary">{formatCurrency(total)}</span>
                    </div>
                    {totalSavings > 0 && (
                      <div className="flex items-center justify-between text-success">
                        <span>Hemat pelanggan</span>
                        <span>-{formatCurrency(totalSavings)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between text-lg font-semibold text-primary">
                      <span>Total Pembayaran</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <Button
                    className="mt-2 h-14 w-full rounded-2xl text-lg font-semibold shadow-sm"
                    onClick={() => setPaymentDialogOpen(true)}
                    disabled={!items.length}
                  >
                    Proses Pembayaran
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </div>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-md space-y-4">
          <DialogHeader>
            <DialogTitle>Pilih Pelanggan</DialogTitle>
            <p className="text-sm text-secondary">
              Diskon pelanggan secara otomatis diterapkan saat transaksi
            </p>
          </DialogHeader>
          <ScrollArea className="max-h-80 pr-2">
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => handleSelectCustomer()}
              >
                <span>Tamu Umum</span>
                <Badge variant="outline">0% diskon</Badge>
              </Button>
              {customers.map((customer) => (
                <Button
                  key={customer.id}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => handleSelectCustomer(customer)}
                >
                  <div className="flex flex-col items-start text-left">
                    <span className="text-base font-semibold text-primary">{customer.name}</span>
                    {customer.discountPercent > 0 && (
                      <span className="text-sm text-success">Diskon {customer.discountPercent}%</span>
                    )}
                  </div>
                  <span
                    className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                    style={{ backgroundColor: customer.color }}
                  >
                    {customer.displayName}
                  </span>
                </Button>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setCustomerDialogOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isPaymentDialogOpen}
        onOpenChange={(open) => {
          setPaymentDialogOpen(open)
          if (!open) {
            setSelectedPaymentMethod("cash")
            setCashReceivedInput("")
          }
        }}
      >
        <DialogContent className="max-w-2xl space-y-6">
          <DialogHeader>
            <DialogTitle>Proses Pembayaran</DialogTitle>
            <p className="text-sm text-secondary">Periksa jumlah dan metode sebelum menyelesaikan transaksi</p>
          </DialogHeader>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
            <p className="text-sm text-secondary">Total Tagihan</p>
            <p className="mt-2 text-4xl font-semibold text-primary">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-secondary">Metode Pembayaran</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button
                variant={selectedPaymentMethod === "cash" ? "default" : "outline"}
                className="h-auto flex-col gap-2 py-4"
                onClick={() => setSelectedPaymentMethod("cash")}
              >
                <DollarSign className="h-6 w-6" aria-hidden />
                Tunai
              </Button>
              <Button
                variant={selectedPaymentMethod === "qris" ? "default" : "outline"}
                className="h-auto flex-col gap-2 py-4"
                onClick={() => setSelectedPaymentMethod("qris")}
              >
                <QrCode className="h-6 w-6" aria-hidden />
                QRIS
              </Button>
              <Button
                variant={selectedPaymentMethod === "kasbon" ? "default" : "outline"}
                className="h-auto flex-col gap-2 py-4"
                onClick={() => setSelectedPaymentMethod("kasbon")}
              >
                <FileText className="h-6 w-6" aria-hidden />
                Kasbon
              </Button>
            </div>
          </div>

          {selectedPaymentMethod === "cash" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickCashOptions.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    onClick={() => setCashReceivedInput(String(amount))}
                  >
                    {amount === total ? "Pas" : formatCurrency(amount)}
                  </Button>
                ))}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-secondary" htmlFor="cash-input">
                  Uang diterima
                </label>
                <Input
                  id="cash-input"
                  type="number"
                  inputMode="numeric"
                  value={cashReceivedInput}
                  onChange={(event) => setCashReceivedInput(event.target.value)}
                  placeholder="Masukkan nominal"
                />
              </div>
              {cashReceivedAmount > 0 && (
                <div
                  className={`rounded-lg border px-4 py-3 text-center ${
                    isCashShort
                      ? "border-warning bg-warning-subtle text-warning"
                      : "border-success bg-success-subtle text-success"
                  }`}
                >
                  <p className="text-sm font-medium">
                    {isCashShort
                      ? `Kurang ${formatCurrency(total - cashReceivedAmount)}`
                      : `Kembalian ${formatCurrency(changeAmount)}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {selectedPaymentMethod === "qris" && (
            <div className="rounded-lg border border-info/30 bg-info-subtle p-6 text-center text-info">
              <QrCode className="mx-auto mb-3 h-20 w-20" aria-hidden />
              <p className="font-semibold">Minta pelanggan memindai QRIS kasir</p>
              <p className="text-sm">Setelah pembayaran diterima, klik proses pembayaran</p>
            </div>
          )}

          {selectedPaymentMethod === "kasbon" && (
            <div className="rounded-lg border border-warning/40 bg-warning-subtle p-4 text-sm text-warning">
              <Users className="mb-2 h-5 w-5" aria-hidden />
              Pilih pelanggan terlebih dahulu sebelum menyimpan transaksi kasbon.
            </div>
          )}

          <DialogFooter className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="sm:min-w-[160px]"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isProcessingPayment}
            >
              Batal
            </Button>
            <Button
              className="sm:min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleProcessPayment}
              disabled={!canSubmitPayment}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Memproses…
                </>
              ) : (
                "Proses Pembayaran"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {receiptData && (
        <ReceiptModal
          isOpen={isReceiptOpen}
          onClose={() => {
            setReceiptOpen(false)
            setReceiptData(null)
          }}
          transactionData={receiptData}
        />
      )}
    </>
  )
}