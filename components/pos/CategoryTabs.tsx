"use client"

import { type LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface CategoryOption {
  id: "gas" | "water" | "general"
  label: string
  icon: LucideIcon
}

interface CategoryTabsProps {
  categories: CategoryOption[]
  activeCategory: CategoryOption["id"]
  onCategoryChange: (category: CategoryOption["id"]) => void
  counts?: Record<CategoryOption["id"], number>
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange, counts }: CategoryTabsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {categories.map((category) => {
        const Icon = category.icon
        const isActive = activeCategory === category.id
        const count = counts?.[category.id]

        return (
          <Button
            key={category.id}
            type="button"
            variant={isActive ? "default" : "outline"}
            className={cn(
              "flex h-auto flex-col gap-2 rounded-2xl border-2 px-4 py-3 text-left transition-all",
              isActive
                ? "border-primary bg-primary text-primary-foreground shadow-lg"
                : "border-transparent bg-white text-secondary hover:border-primary/40 hover:text-primary"
            )}
            onClick={() => onCategoryChange(category.id)}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    isActive ? "bg-white/20 text-white" : "bg-surface-tertiary text-secondary"
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-base font-semibold">{category.label}</span>
              </div>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    isActive ? "bg-white/20 text-white" : "bg-surface-tertiary text-secondary"
                  )}
                >
                  {count}
                </span>
              )}
            </div>
          </Button>
        )
      })}
    </div>
  )
}
