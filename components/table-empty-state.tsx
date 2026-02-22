"use client"

import { Package } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type TableEmptyStateProps = {
  title: string
  description: string
  icon?: LucideIcon
  className?: string
}

export function TableEmptyState({
  title,
  description,
  icon: Icon = Package,
  className,
}: TableEmptyStateProps) {
  return (
    <div className={cn("table-empty-state", className)}>
      <div className="table-empty-state-icon-wrap" aria-hidden>
        <Icon className="table-empty-state-icon" />
      </div>
      <p className="table-empty-state-title">{title}</p>
      <p className="table-empty-state-description">{description}</p>
    </div>
  )
}
