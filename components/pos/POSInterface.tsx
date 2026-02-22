"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Clock3,
  ChevronDown,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Users,
  User,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { PageLoadingState } from "@/components/page-loading-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { CartItemRow } from "@/components/pos/CartItemRow"
import { CategoryOption, CategoryTabs } from "@/components/pos/CategoryTabs"
import { ProductCard, type DisplayProduct } from "@/components/pos/ProductCard"
import { ReceiptModal } from "@/components/pos/ReceiptModal"
import { getCustomersForCurrentPangkalan } from "@/lib/actions/customers"
import { getActivePangkalanCapitalBalance } from "@/lib/actions/capital"
import { getProductsForCurrentPangkalan } from "@/lib/actions/products"
import { createTransaction } from "@/lib/actions/transactions"
import { getProductTierPricings } from "@/lib/actions/product-tier-pricing"
import { resolveDiscountClient, type ProductTierPricingItem } from "@/lib/discount-utils"
import { useCartStore } from "@/lib/stores/cart-store"
import { formatCurrency } from "@/lib/utils"

// Types
interface Product {
  id: string
  name: string
  category: "gas" | "water" | "general"
  basePrice: number
  costPrice: number
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
  { id: "all", label: "Semua Produk" },
  { id: "gas", label: "Gas LPG" },
  { id: "water", label: "Air Galon" },
  { id: "general", label: "Lainnya" },
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
  costPrice?: string | number | null
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
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState<"all" | Product["category"]>("all")
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
  const [capitalBalance, setCapitalBalance] = useState(0)
  const [now, setNow] = useState(() => new Date())

  const cartStore = useCartStore()
  const {
    items,
    total,
    itemCount,
    customerId,
    customerName,
    customerDiscountPercent,
    customerTypeId: cartCustomerTypeId,
    productTierPricings,
    addItem,
    removeItem,
    updateQuantity,
    setCustomer,
    setProductTierPricings,
    clearCart,
  } = cartStore

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [productsResult, customersResult, pricingsResult, capitalResult] = await Promise.all([
        getProductsForCurrentPangkalan(),
        getCustomersForCurrentPangkalan(),
        getProductTierPricings(),
        getActivePangkalanCapitalBalance(),
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
              costPrice: Number(product.costPrice ?? 0),
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

      if (pricingsResult.success && pricingsResult.data) {
        setProductTierPricings(pricingsResult.data as ProductTierPricingItem[])
      }

      if (capitalResult.success) {
        setCapitalBalance(capitalResult.data.balance)
      }
    } catch (error) {
      console.error("Error loading POS data", error)
    } finally {
      setLoading(false)
    }
  }, [setProductTierPricings])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const categoryCounts = useMemo(() => {
    const counts = products.reduce(
      (acc, product) => {
        acc[product.category] += 1
        return acc
      },
      { gas: 0, water: 0, general: 0 } as Record<Product["category"], number>
    )
    return {
      all: products.length,
      gas: counts.gas,
      water: counts.water,
      general: counts.general,
    } as Record<string, number>
  }, [products])

  const productCards: DisplayProduct[] = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return products
      .filter((product) => (activeCategory === "all" ? true : product.category === activeCategory))
      .filter((product) =>
        query.length === 0 ? true : product.name.toLowerCase().includes(query)
      )
      .map((product) => {
        const resolved = resolveDiscountClient(
          product.id,
          cartCustomerTypeId,
          product.basePrice,
          product.category,
          productTierPricings,
          customerDiscountPercent
        );
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          basePrice: product.basePrice,
          price: resolved.finalPrice,
          stock: product.stock,
          imageUrl: product.imageUrl,
        };
      })
  }, [products, activeCategory, searchTerm, customerDiscountPercent, cartCustomerTypeId, productTierPricings])

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
  const serviceTax = 0

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
      costPrice: product.costPrice,
      imageUrl: product.imageUrl,
    }, product.stock)

    if (!success) {
      const cartItem = items.find((item) => item.productId === productId)
      const currentCartQuantity = cartItem ? cartItem.quantity : 0
      toast.error(`Stok tidak cukup. Stok tersedia ${product.stock}, diminta ${currentCartQuantity + 1}.`)
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

  const handleIncreaseQuantity = (productId: string, currentQuantity: number) => {
    const product = products.find((item) => item.id === productId)
    const nextQuantity = currentQuantity + 1
    const success = updateQuantity(productId, nextQuantity, product?.stock)

    if (!success && product) {
      toast.error(`Stok tidak cukup. Stok tersedia ${product.stock}, diminta ${nextQuantity}.`)
    }
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
        .map((item) => `${item.productName} (${item.requested}/${item.available})`)
        .join(", ")
      toast.error(`Stok tidak cukup untuk: ${errorMessage}.`)
      return
    }

    const payload = {
      customerId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.discountedPrice,
        subtotal: item.subtotal,
        costPrice: item.costPrice,
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
        toast.error(result.error || "Gagal memproses pembayaran.")
      }
    } catch (error) {
      console.error("Payment processing error", error)
      toast.error("Terjadi kesalahan saat memproses pembayaran.")
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

  const todayLabel = useMemo(
    () =>
      now.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [now]
  )

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [now]
  )

  if (loading) {
    return <PageLoadingState title="Memuat POS" fullScreen />
  }

  return (
    <>
      <div className="h-full w-full overflow-hidden bg-[#f6f6f8]">
        <div className="flex h-full w-full overflow-hidden">
          <main className="flex min-w-0 flex-1 flex-col bg-[#fdfdfd]">
            <header className="flex min-h-16 flex-wrap items-center justify-between gap-y-4 border-b border-[#e5e7eb] bg-white px-6 py-3">
              <div className="flex min-w-0 flex-1 max-w-xl items-center gap-4 pr-4">
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6b7280]" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cari produk (Cmd+K)"
                    className="h-10 rounded-full border border-[#e5e7eb] bg-[#f9fafb] pl-10 pr-4 text-sm text-[#111827] shadow-sm transition-all focus-visible:border-[#396fe4] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#396fe4]"
                  />
                </div>

              </div>
              <div className="flex shrink-0 items-center gap-5">
                <div className="hidden items-center gap-3 lg:flex">
                  <div className="text-right">
                    <p className="text-sm font-semibold leading-none text-[#111827] whitespace-nowrap">Kasir Utama</p>
                    <p className="mt-1 text-[13px] text-[#6b7280] whitespace-nowrap">Modal {formatCurrency(capitalBalance)}</p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-[#f9fafb] text-[#6b7280]">
                    <User className="size-5" />
                  </div>
                </div>

                <div className="hidden h-8 w-px bg-[#e5e7eb] lg:block" />

                <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 shadow-sm">
                  <Clock3 className="size-4 shrink-0 text-[#6b7280]" />
                  <div className="flex flex-col">
                    <p className="mb-0.5 text-[10px] font-bold leading-none tracking-wider text-[#6b7280] whitespace-nowrap">{todayLabel}</p>
                    <p className="text-sm font-semibold leading-none tabular-nums text-[#111827] whitespace-nowrap">{timeLabel}</p>
                  </div>
                </div>
              </div>
            </header>

            <div className="px-6 py-4">
              <CategoryTabs
                categories={CATEGORY_OPTIONS}
                activeCategory={activeCategory}
                onCategoryChange={(category) => setActiveCategory(category as "all" | Product["category"])}
                counts={categoryCounts}
              />
            </div>

            <section className="flex-1 overflow-y-auto px-6 pb-6 [scrollbar-width:thin]">
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
                <button
                  type="button"
                  className="group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition-all hover:border-[#396fe4]"
                  onClick={() => router.push("/dashboard/products")}
                >
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-[#f6f6f8]">
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="rounded-full border border-[#e5e7eb] p-2 text-[#6b7280]">
                        <Plus className="size-5" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#374151]">Tambah Produk</h3>
                    <p className="mt-1 text-sm font-bold text-[#396fe4]">Buka katalog produk</p>
                  </div>
                </button>

                {productCards.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    quantityInCart={items.find((item) => item.productId === product.id)?.quantity || 0}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            </section>
          </main>

          <aside className="w-[350px] shrink-0 border-l border-[#e5e7eb] bg-white lg:w-[400px]">
            <div className="flex h-full flex-col">
              <div className="border-b border-[#e5e7eb] p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#374151]">Pesanan Baru</h2>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-sm font-bold text-[#396fe4]"
                    onClick={() => setCustomerDialogOpen(true)}
                  >
                    <Plus className="size-4" />
                    Pelanggan
                  </button>
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-[#e5e7eb] bg-[#f6f6f8] p-3 text-left"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <Users className="size-5 text-[#6b7280]" />
                  <div className="flex-1">
                    <p className="text-xs text-[#6b7280]">Pelanggan</p>
                    <p className="text-sm font-semibold text-[#374151]">{customerName ?? "Walk-in Customer"}</p>
                  </div>
                  <ChevronDown className="size-4 text-[#6b7280]" />
                </button>
                {customerDiscountPercent > 0 && (
                  <p className="mt-2 text-xs text-[#16a34a]">Diskon pelanggan {customerDiscountPercent}%</p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 [scrollbar-width:thin]">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-[#e5e7eb] bg-[#f6f6f8] px-6 text-center text-[#6b7280]">
                    <ShoppingCart className="mb-3 size-10" />
                    <p className="font-semibold text-[#374151]">Keranjang masih kosong</p>
                    <p className="text-sm">Pilih produk untuk mulai transaksi</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {items.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        onDecrease={(productId) => updateQuantity(productId, item.quantity - 1)}
                        onIncrease={(productId) => handleIncreaseQuantity(productId, item.quantity)}
                        onRemove={removeItem}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-[#e5e7eb] bg-[#f6f6f8]/60 p-6">
                <div className="mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Subtotal ({itemCount})</span>
                    <span className="font-medium text-[#374151]">{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">PPN (11%)</span>
                    <span className="font-medium text-[#374151]">{formatCurrency(serviceTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6b7280]">Diskon</span>
                    <span className="font-medium text-red-500">-{formatCurrency(totalSavings)}</span>
                  </div>
                  <div className="flex items-end justify-between border-t border-dashed border-[#e5e7eb] pt-3">
                    <span className="text-base font-bold text-[#374151]">Total</span>
                    <span className="text-2xl font-black text-[#396fe4]">{formatCurrency(total + serviceTax)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="h-12 rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-bold text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
                  >
                    Simpan Bil
                  </button>
                  <button
                    type="button"
                    className="h-12 rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-bold text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
                  >
                    Cetak Draft
                  </button>
                </div>

                <button
                  type="button"
                  className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#396fe4] text-lg font-bold text-white shadow-lg shadow-[#396fe4]/30 transition-colors hover:bg-[#396fe4]/90 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setPaymentDialogOpen(true)}
                  disabled={!items.length}
                >
                  <DollarSign className="size-5" />
                  Bayar Sekarang
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={isCustomerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">Pilih Pelanggan</DialogTitle>
            <p className="text-sm text-secondary leading-relaxed">
              Diskon pelanggan secara otomatis diterapkan saat transaksi
            </p>
          </DialogHeader>
          <div className="space-y-8">
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
          </div>
          <Separator className="hidden md:block" />
          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button variant="outline" className="h-12 rounded-lg px-6 text-base w-full sm:w-auto" onClick={() => setCustomerDialogOpen(false)}>
              Tutup
            </Button>
          </div>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">Proses Pembayaran</DialogTitle>
            <p className="text-sm text-secondary leading-relaxed">Periksa jumlah dan metode sebelum menyelesaikan transaksi</p>
          </DialogHeader>

          <div className="space-y-8">
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
                  <NumericInput
                    id="cash-input"
                    value={cashReceivedInput}
                    onValueChange={setCashReceivedInput}
                    placeholder="Masukkan nominal"
                  />
                </div>
                {cashReceivedAmount > 0 && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-center ${isCashShort
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

          </div>
          <Separator className="hidden md:block" />
          <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-12 rounded-lg px-6 text-base"
              onClick={() => setPaymentDialogOpen(false)}
              disabled={isProcessingPayment}
            >
              Batal
            </Button>
            <Button
              variant="brand"
              className="h-12 rounded-lg px-6 text-base"
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
          </div>
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
