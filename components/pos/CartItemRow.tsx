"use client"

import Image from "next/image"
import { Minus, Package, Plus, Trash2 } from "lucide-react"

import { formatCurrency } from "@/lib/utils"
import type { CartItem as CartItemModel } from "@/lib/stores/cart-store"

interface CartItemRowProps {
  item: CartItemModel
  onDecrease: (productId: string) => void
  onIncrease: (productId: string) => void
  onRemove: (productId: string) => void
}

export function CartItemRow({ item, onDecrease, onIncrease, onRemove }: CartItemRowProps) {
  const discountPercent = item.basePrice > 0 ? Math.round((1 - item.discountedPrice / item.basePrice) * 100) : 0
  const hasDiscount = discountPercent > 0

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-[#f6f6f8]">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#9ca3af]">
              <Package className="size-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-[#374151]">{item.name}</h4>
            <button
              type="button"
              className="text-[#ef4444] transition-colors hover:text-[#dc2626]"
              onClick={() => onRemove(item.productId)}
              aria-label={`Hapus ${item.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
          <p className="mt-0.5 text-xs text-[#6b7280]">{formatCurrency(item.discountedPrice)}</p>
          <div className="mt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded border border-[#e5e7eb] text-[#6b7280] hover:border-[#396fe4]/50 hover:bg-[#396fe4]/10 hover:text-[#396fe4] disabled:opacity-50"
                onClick={() => onDecrease(item.productId)}
                disabled={item.quantity <= 1}
                aria-label={`Kurangi ${item.name}`}
              >
                <Minus className="size-3.5" />
              </button>
              <span className="text-sm font-bold text-[#374151]">{item.quantity}</span>
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded border border-[#e5e7eb] text-[#6b7280] hover:border-[#396fe4]/50 hover:bg-[#396fe4]/10 hover:text-[#396fe4]"
                onClick={() => onIncrease(item.productId)}
                aria-label={`Tambah ${item.name}`}
              >
                <Plus className="size-3.5" />
              </button>
            </div>
            <p className="text-sm font-bold text-[#374151]">{formatCurrency(item.subtotal)}</p>
          </div>
          {hasDiscount && (
            <p className="mt-1 text-[11px] font-medium text-red-500">{discountPercent}% off</p>
          )}
        </div>
      </div>
      <div className="h-px bg-[#e5e7eb]" />
    </div>
  )
}
