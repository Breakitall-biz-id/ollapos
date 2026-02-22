"use client"

import { AlertTriangle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"

type SetupRequiredBannerProps = {
  title: string
  description: string
  actionLabel: string
  actionInProgressLabel: string
  isLoading?: boolean
  onAction: () => void | Promise<void>
  className?: string
}

export function SetupRequiredBanner({
  title,
  description,
  actionLabel,
  actionInProgressLabel,
  isLoading = false,
  onAction,
  className,
}: SetupRequiredBannerProps) {
  return (
    <div className={className ?? "rounded-2xl border border-warning/50 bg-warning-subtle p-4 text-warning"}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" aria-hidden />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <p className="mt-2 text-sm">{description}</p>
      <Button
        variant="outline"
        className="mt-3 border-warning/60 bg-white text-warning hover:bg-warning/10"
        onClick={() => void onAction()}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            {actionInProgressLabel}
          </>
        ) : (
          actionLabel
        )}
      </Button>
    </div>
  )
}
