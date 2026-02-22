"use client"

import { CalendarDays, Search } from "lucide-react"
import type { ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TablePageHeaderProps = {
  title: string
  subtitle: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  dateLabel?: string
  rightContent?: ReactNode
}

export function TablePageHeader({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Cari data...",
  dateLabel,
  rightContent,
}: TablePageHeaderProps) {
  const hasSearch = typeof searchValue === "string" && typeof onSearchChange === "function"
  const hasActions = Boolean(dateLabel || rightContent)
  const showTopbar = hasSearch || hasActions

  return (
    <div className="table-page-header">
      <div className="table-page-heading">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {showTopbar ? (
        <div className="table-page-topbar">
          {hasSearch ? (
            <div className="table-page-search">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
              />
            </div>
          ) : null}
          {hasActions ? (
            <div className={cn("table-page-actions", !hasSearch && "table-page-actions-no-search")}>
              {dateLabel ? (
                <span className="table-date-chip">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  {dateLabel}
                </span>
              ) : null}
              {rightContent}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
