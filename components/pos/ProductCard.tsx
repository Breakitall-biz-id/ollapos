"use client"

import { KeyboardEvent, memo, useState } from "react"
import Image from "next/image"
import { Package, Plus } from "lucide-react"

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
}

function ProductCardComponent({
  product,
  quantityInCart,
  onAddToCart,
}: ProductCardProps) {
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

  const stockTone =
    product.stock <= 2
      ? "text-red-600 bg-red-50"
      : product.stock <= 10
        ? "text-orange-600 bg-orange-50"
        : "text-green-600 bg-green-50"

  return (
    <div
      role={outOfStock ? "presentation" : "button"}
      tabIndex={outOfStock ? -1 : 0}
      onClick={outOfStock ? undefined : handleActivate}
      onKeyDown={outOfStock ? undefined : handleKeyDown}
      className={cn(
        "group flex h-full cursor-pointer flex-col gap-3 rounded-xl border border-[#e5e7eb] bg-white p-3 transition-all",
        outOfStock ? "cursor-not-allowed opacity-70" : "hover:border-[#396fe4]",
        quantityInCart > 0 && "border-[#396fe4] ring-1 ring-[#396fe4]/30"
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-[#f6f6f8]">
        {product.imageUrl && !hasImageError ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
            onError={() => setHasImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#396fe4]/5 text-[#396fe4]/30">
            <Package className="size-14" aria-hidden />
            <span className="sr-only">Tidak ada gambar {product.name}</span>
          </div>
        )}

        {quantityInCart > 0 && (
          <span className="absolute left-2 top-2 rounded-md bg-[#396fe4] px-2 py-0.5 text-[10px] font-bold text-white">
            {quantityInCart}x
          </span>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-[#396fe4]/0 opacity-0 transition-all group-hover:bg-[#396fe4]/10 group-hover:opacity-100">
          {!outOfStock && (
            <span className="flex size-10 items-center justify-center rounded-full bg-[#396fe4] text-white">
              <Plus className="size-5" />
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className={cn("line-clamp-1 text-sm font-semibold", outOfStock ? "text-[#9ca3af]" : "text-[#374151]")}>
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-[#396fe4]">{formatCurrency(product.price)}</p>
          {hasDiscount && (
            <p className="text-xs text-[#9ca3af] line-through">{formatCurrency(product.basePrice)}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className={cn("flex w-fit items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium", stockTone)}>
            <Package className="size-3" />
            <span>{outOfStock ? "Habis" : `Stok: ${product.stock}`}</span>
          </div>
          <span className="text-[11px] text-[#9ca3af]">{CATEGORY_LABEL[product.category]}</span>
        </div>
      </div>
      {hasDiscount && !outOfStock && (
        <p className="text-[11px] font-semibold text-red-500">
          Hemat {formatCurrency(savings)}
        </p>
      )}
    </div>
  )
}

export const ProductCard = memo(ProductCardComponent)
