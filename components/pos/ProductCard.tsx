"use client"

import { KeyboardEvent, memo, useState } from "react"
import Image from "next/image"
import { AlertTriangle, Package } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"

const CATEGORY_LABEL: Record<"gas" | "water" | "general", string> = {
  gas: "Gas LPG",
  water: "Air Galon",
  general: "Produk Lain",
}

export interface DisplayProduct {
  id: string
  name: string
  category: "gas" | "water" | "general"
  basePrice: number
  price: number
  stock: number
  imageUrl?: string
}

interface ProductCardProps {
  product: DisplayProduct
  quantityInCart: number
  onAddToCart: (productId: string) => void
  onAdjustQuantity?: (productId: string) => void
}

function ProductCardComponent({
  product,
  quantityInCart,
  onAddToCart,
  onAdjustQuantity,
}: ProductCardProps) {
  const lowStock = product.stock <= 5 // More sensitive low stock threshold
  const criticalStock = product.stock <= 2
  const outOfStock = product.stock <= 0
  const hasDiscount = product.basePrice > product.price
  const savings = hasDiscount ? product.basePrice - product.price : 0
  const [hasImageError, setHasImageError] = useState(false)

  const handleActivate = () => {
    onAddToCart(product.id)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleActivate()
    }
  }

  return (
    <Card
      role={outOfStock ? "presentation" : "button"}
      tabIndex={outOfStock ? -1 : 0}
      onClick={outOfStock ? undefined : handleActivate}
      onKeyDown={outOfStock ? undefined : handleKeyDown}
      className={cn(
        "group relative flex h-full flex-col gap-4 overflow-hidden rounded-3xl border border-medium/50 bg-white p-4 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.8)] transition-all duration-150",
        outOfStock
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer hover:-translate-y-1 hover:border-primary/50"
      )}
    >
      <div className="relative aspect-[5/4] w-full overflow-hidden rounded-2xl bg-surface-secondary">
        {product.imageUrl && !hasImageError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
            className="object-cover"
            unoptimized
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted">
            <Package className="size-12" aria-hidden />
            <span className="sr-only">Tidak ada gambar {product.name}</span>
          </div>
        )}

        {quantityInCart > 0 && (
          <button
            type="button"
            aria-label={`Atur jumlah ${product.name}`}
            onClick={(event) => {
              event.stopPropagation()
              onAdjustQuantity?.(product.id)
            }}
            className="absolute right-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow"
          >
            {quantityInCart} di keranjang
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 px-1 pb-2">
        <div className="flex items-center justify-between gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-secondary">
          <Badge variant="outline" className="rounded-full border-transparent bg-surface-tertiary px-3 py-1 text-[0.65rem] font-semibold">
            {CATEGORY_LABEL[product.category]}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-medium",
              outOfStock
                ? "bg-surface-tertiary text-muted border-muted"
                : criticalStock
                ? "bg-warning-subtle text-warning border-warning/50"
                : lowStock
                ? "bg-surface-tertiary text-secondary border-secondary/50"
                : "bg-surface-tertiary text-secondary border-transparent"
            )}
          >
            {outOfStock ? "Habis" : `Stok ${product.stock}`}
          </Badge>
        </div>

        <div className="space-y-2">
          <h3 className={cn(
            "line-clamp-2 text-xl font-semibold leading-tight",
            outOfStock ? "text-muted" : "text-primary"
          )}>
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className={cn(
              "text-3xl font-bold",
              outOfStock ? "text-muted" : "text-primary"
            )}>
              {formatCurrency(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-base text-muted line-through">
                {formatCurrency(product.basePrice)}
              </span>
            )}
          </div>
          {hasDiscount && !outOfStock && (
            <p className="text-base font-semibold text-success">
              Hemat {formatCurrency(savings)}
            </p>
          )}
        </div>

        {criticalStock && !outOfStock && (
          <div className="flex items-center gap-1 rounded-xl bg-warning-subtle px-2 py-1 text-sm font-medium text-warning">
            <AlertTriangle className="size-4" aria-hidden />
            <span>Segera habis</span>
          </div>
        )}

        <Button
          size="lg"
          className={cn(
            "mt-auto w-full rounded-2xl text-base font-semibold",
            outOfStock && "pointer-events-none"
          )}
          onClick={(event) => {
            event.stopPropagation()
            handleActivate()
          }}
          disabled={outOfStock}
          variant={outOfStock ? "ghost" : "default"}
        >
          {outOfStock ? "Tidak Tersedia" : "+ Tambah"}
        </Button>
      </div>
    </Card>
  )
}

export const ProductCard = memo(ProductCardComponent)
