"use client"

import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TableSectionCardProps = {
  title?: ReactNode
  description?: ReactNode
  headerContent?: ReactNode
  controls?: ReactNode
  controlsClassName?: string
  topContent?: ReactNode
  isEmpty?: boolean
  emptyState?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  footerClassName?: string
  className?: string
  contentClassName?: string
  panelClassName?: string
}

export function TableSectionCard({
  title,
  description,
  headerContent,
  controls,
  controlsClassName,
  topContent,
  isEmpty = false,
  emptyState,
  children,
  footer,
  footerClassName,
  className,
  contentClassName,
  panelClassName,
}: TableSectionCardProps) {
  const hasHeader = Boolean(title || description || headerContent)

  return (
    <Card className={cn("table-list-card table-list-card-standalone", className)}>
      {hasHeader ? (
        <CardHeader className="table-section-header">
          <div className="table-section-header-main">
            {title ? <CardTitle className="table-section-title">{title}</CardTitle> : null}
            {description ? <p className="table-section-description">{description}</p> : null}
          </div>
          {headerContent ? <div className="table-section-header-extra">{headerContent}</div> : null}
        </CardHeader>
      ) : null}
      <CardContent className={cn("table-list-card-body", contentClassName)}>
        {controls ? <div className={cn("table-section-controls", controlsClassName)}>{controls}</div> : null}
        {topContent}
        <div className={cn("table-panel", panelClassName)}>
          {isEmpty ? emptyState : children}
          {!isEmpty && footer ? (
            <div className={cn("table-panel-footer", footerClassName)}>{footer}</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
