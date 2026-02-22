"use client"

import { cn } from "@/lib/utils"

export interface CategoryOption {
  id: string
  label: string
}

interface CategoryTabsProps {
  categories: CategoryOption[]
  activeCategory: string
  onCategoryChange: (category: string) => void
  counts?: Record<string, number>
}

export function CategoryTabs({ categories, activeCategory, onCategoryChange, counts }: CategoryTabsProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 pr-1">
      {categories.map((category) => {
        const isActive = activeCategory === category.id

        return (
          <button
            key={category.id}
            type="button"
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-all",
              isActive
                ? "border-[#396fe4] bg-[#396fe4] text-white shadow-sm shadow-[#396fe4]/20"
                : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#396fe4]/50 hover:text-[#396fe4]"
            )}
            onClick={() => onCategoryChange(category.id)}
          >
            {category.label}
            {typeof counts?.[category.id] === "number" && (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-[11px]",
                  isActive ? "bg-white/20 text-white" : "bg-[#f3f4f6] text-[#6b7280]"
                )}
              >
                {counts[category.id]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
