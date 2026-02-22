"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

const UI_SCALE_STORAGE_KEY = "ollapos:ui-scale-level"
const LEGACY_SIMPLE_MODE_STORAGE_KEY = "ollapos:simple-mode"
type UiScaleLevel = "normal" | "besar" | "sangat-besar"

const UI_SCALE_CLASS_MAP: Record<UiScaleLevel, string | null> = {
  normal: null,
  besar: "mode-ui-besar",
  "sangat-besar": "mode-ui-sangat-besar",
}
const UI_SCALE_CLASSES = Object.values(UI_SCALE_CLASS_MAP).filter((value): value is string => Boolean(value))

export function SiteHeader() {
  const [uiScaleLevel, setUiScaleLevel] = useState<UiScaleLevel>("normal")
  const [isHydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const savedScaleLevel = window.localStorage.getItem(UI_SCALE_STORAGE_KEY) as UiScaleLevel | null
      if (savedScaleLevel === "normal" || savedScaleLevel === "besar" || savedScaleLevel === "sangat-besar") {
        setUiScaleLevel(savedScaleLevel)
      } else {
        const legacySimpleMode = window.localStorage.getItem(LEGACY_SIMPLE_MODE_STORAGE_KEY)
        setUiScaleLevel(legacySimpleMode === "1" ? "besar" : "normal")
      }
    } catch (error) {
      console.error("Failed to read UI scale preference", error)
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    document.body.classList.remove(...UI_SCALE_CLASSES)
    const activeScaleClass = UI_SCALE_CLASS_MAP[uiScaleLevel]
    if (activeScaleClass) {
      document.body.classList.add(activeScaleClass)
    }

    try {
      window.localStorage.setItem(UI_SCALE_STORAGE_KEY, uiScaleLevel)
      window.localStorage.setItem(LEGACY_SIMPLE_MODE_STORAGE_KEY, uiScaleLevel === "normal" ? "0" : "1")
    } catch (error) {
      console.error("Failed to persist UI scale preference", error)
    }

    return () => {
      document.body.classList.remove(...UI_SCALE_CLASSES)
    }
  }, [uiScaleLevel, isHydrated])

  const levelOptions: Array<{ value: UiScaleLevel; label: string }> = [
    { value: "normal", label: "Normal" },
    { value: "besar", label: "Besar" },
    { value: "sangat-besar", label: "Sangat Besar" },
  ]

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-medium/40 bg-white transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 hidden" />
        <h1 className="text-base font-semibold">Dasbor</h1>
        <div className="ml-auto hidden items-center gap-2 rounded-lg border border-medium/40 bg-surface px-2 py-1 md:flex">
          <span className="px-1 text-sm font-medium text-primary">Ukuran</span>
          <div className="flex items-center gap-1">
            {levelOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={uiScaleLevel === option.value ? "default" : "outline"}
                className="h-8 rounded-md px-3 text-sm"
                onClick={() => setUiScaleLevel(option.value)}
                disabled={!isHydrated}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
