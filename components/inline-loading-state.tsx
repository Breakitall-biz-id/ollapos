"use client"

import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

type InlineLoadingStateProps = {
  title: string
  description?: string
  className?: string
}

export function InlineLoadingState({
  title,
  description,
  className,
}: InlineLoadingStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#e5e7eb] bg-white px-6 py-8 text-center",
        className
      )}
    >
      <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" aria-hidden />
      <p className="mt-3 text-sm font-semibold text-[#111827]">{title}</p>
      {description ? <p className="mt-1 text-xs text-[#6b7280]">{description}</p> : null}
    </div>
  )
}
