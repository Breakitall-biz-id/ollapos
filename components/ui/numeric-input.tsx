"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"

type NumericInputProps = Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value?: string | number | null
  onValueChange?: (value: string) => void
  allowDecimal?: boolean
  maxFractionDigits?: number
}

function sanitizeNumericInput(value: string, allowDecimal: boolean, maxFractionDigits: number) {
  if (!allowDecimal) {
    return value.replace(/\D/g, "")
  }
  const cleaned = value.replace(/[^\d.,]/g, "")
  if (!cleaned.includes(",")) {
    return cleaned.replace(/\D/g, "")
  }

  const [rawInteger = "", ...fractionChunks] = cleaned.split(",")
  const integerPart = rawInteger.replace(/\D/g, "")
  const fractionPart = fractionChunks.join("").replace(/\D/g, "").slice(0, Math.max(0, maxFractionDigits))
  const hasTrailingComma = cleaned.endsWith(",")

  if (!fractionPart && !hasTrailingComma) {
    return integerPart
  }

  return `${integerPart}.${fractionPart}`
}

function formatThousands(value: string, allowDecimal: boolean) {
  if (!value) return ""

  const [intPartRaw = "", fractionPart = ""] = value.split(".")
  const intPart = intPartRaw.replace(/^0+(?=\d)/, "")
  const grouped = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  if (!allowDecimal) return grouped
  if (!value.includes(".")) return grouped
  return `${grouped},${fractionPart}`
}

export function NumericInput({
  value,
  onValueChange,
  allowDecimal = false,
  maxFractionDigits = 2,
  inputMode,
  ...props
}: NumericInputProps) {
  const raw = value == null ? "" : String(value)
  const displayValue = formatThousands(raw, allowDecimal)

  return (
    <Input
      {...props}
      type="text"
      inputMode={inputMode ?? (allowDecimal ? "decimal" : "numeric")}
      autoComplete="off"
      value={displayValue}
      onChange={(event) => {
        const nextValue = sanitizeNumericInput(event.target.value, allowDecimal, maxFractionDigits)
        onValueChange?.(nextValue)
      }}
    />
  )
}
