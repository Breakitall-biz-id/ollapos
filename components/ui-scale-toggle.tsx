"use client"

import { useEffect, useMemo, useState } from "react"
import { ZoomIn } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const UI_SCALE_STORAGE_KEY = "ollapos:ui-scale-level"
const LEGACY_SIMPLE_MODE_STORAGE_KEY = "ollapos:simple-mode"

type UiScaleLevel = "normal" | "besar" | "sangat-besar"

const UI_SCALE_CLASS_MAP: Record<UiScaleLevel, string | null> = {
  normal: null,
  besar: "mode-ui-besar",
  "sangat-besar": "mode-ui-sangat-besar",
}

const UI_SCALE_CLASSES = Object.values(UI_SCALE_CLASS_MAP).filter((value): value is string => Boolean(value))

const NEXT_LEVEL: Record<UiScaleLevel, UiScaleLevel> = {
  normal: "besar",
  besar: "sangat-besar",
  "sangat-besar": "normal",
}

const LABEL_BY_LEVEL: Record<UiScaleLevel, string> = {
  normal: "Normal",
  besar: "Besar",
  "sangat-besar": "Sangat Besar",
}

export function UiScaleToggle({ collapsed = false }: { collapsed?: boolean }) {
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
  }, [isHydrated, uiScaleLevel])

  const nextLabel = useMemo(() => LABEL_BY_LEVEL[NEXT_LEVEL[uiScaleLevel]], [uiScaleLevel])

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setUiScaleLevel((prev) => NEXT_LEVEL[prev])}
      disabled={!isHydrated}
      className={cn(
        "h-10 rounded-lg border-[#d7dfe9] bg-white text-[#475467] hover:bg-[#f8fbff] hover:text-[#344054]",
        collapsed ? "w-10 px-0" : "w-full justify-start gap-2 px-3"
      )}
      title={`Perbesar tampilan (selanjutnya: ${nextLabel})`}
      aria-label={`Perbesar tampilan (selanjutnya: ${nextLabel})`}
    >
      <ZoomIn className="h-4 w-4" aria-hidden />
      {!collapsed ? (
        <span className="text-[13px] font-medium">Tampilan: {LABEL_BY_LEVEL[uiScaleLevel]}</span>
      ) : null}
    </Button>
  )
}
