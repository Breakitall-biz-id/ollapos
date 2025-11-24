"use client"

import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
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
    <Card className="flex flex-col gap-3 rounded-2xl border border-medium/40 bg-white p-4 shadow-[0_22px_60px_-50px_rgba(15,23,42,0.85)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-base font-semibold text-primary">{item.name}</p>
          <div className="text-sm text-secondary">
            {formatCurrency(item.discountedPrice)} × {item.quantity}
            {hasDiscount && (
              <span className="ml-2 font-medium text-success">- {discountPercent}%</span>
            )}
          </div>
          {hasDiscount && (
            <p className="text-xs text-muted line-through">
              {formatCurrency(item.basePrice)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            onClick={() => onDecrease(item.productId)}
            disabled={item.quantity <= 1}
            aria-label={`Kurangi ${item.name}`}
          >
            <Minus className="size-4" aria-hidden />
          </Button>
          <span className="min-w-[3rem] text-center text-lg font-semibold text-primary">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-9 rounded-full"
            onClick={() => onIncrease(item.productId)}
            aria-label={`Tambah ${item.name}`}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-full text-danger hover:bg-danger-subtle hover:text-danger"
            onClick={() => onRemove(item.productId)}
            aria-label={`Hapus ${item.name}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <div className={cn("text-right text-lg font-bold", hasDiscount ? "text-success" : "text-primary")}
      >
        {formatCurrency(item.subtotal)}
      </div>
    </Card>
  )
}
