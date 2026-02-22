"use client"

import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type PageLoadingStateProps = {
  title: string
  description?: string
  minHeightClassName?: string
  fullScreen?: boolean
  className?: string
}

export function PageLoadingState({
  title,
  description = "Mohon tunggu sesaat…",
  minHeightClassName = "min-h-[420px]",
  fullScreen = false,
  className,
}: PageLoadingStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center px-4",
        fullScreen ? "min-h-screen bg-[#f6f6f8]" : minHeightClassName,
        className
      )}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#e5e7eb] bg-white px-7 py-8 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="mt-4 text-lg font-semibold text-[#111827]">{title}</p>
        <p className="mt-1 text-sm text-[#6b7280]">{description}</p>
      </div>
    </div>
  )
}
