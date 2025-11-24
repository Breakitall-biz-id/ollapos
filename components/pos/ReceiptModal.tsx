"use client"

import { useMemo, useState } from "react"
import { Download, FileText, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/utils"

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  transactionData: {
    id: string
    items: Array<{
      name: string
      quantity: number
      price: number
      subtotal: number
    }>
    total: number
    paymentMethod: "cash" | "qris" | "kasbon"
    cashReceived?: number
    changeAmount?: number
    customerName?: string
    createdAt: Date
  }
}

export function ReceiptModal({ isOpen, onClose, transactionData }: ReceiptModalProps) {
  const [isPrinting, setIsPrinting] = useState(false)

  const PAYMENT_LABELS: Record<ReceiptModalProps["transactionData"]["paymentMethod"], string> = {
    cash: "Tunai",
    qris: "QRIS",
    kasbon: "Kasbon",
  }

  const formattedDateTime = useMemo(
    () =>
      new Date(transactionData.createdAt).toLocaleString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [transactionData.createdAt]
  )

  const totalItems = useMemo(
    () => transactionData.items.reduce((sum, item) => sum + item.quantity, 0),
    [transactionData.items]
  )

  const handlePrint = () => {
    setIsPrinting(true)
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      const receiptContent = `
        <html>
          <head>
            <title>Struk Pembayaran - ${transactionData.id}</title>
            <style>
              body { font-family: 'Courier New', monospace; padding: 20px; max-width: 400px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .title { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
              .subtitle { font-size: 14px; margin-bottom: 6px; }
              .info { margin-bottom: 15px; font-size: 14px; }
              .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 15px 0; }
              .item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; }
              .total { text-align: right; font-weight: bold; margin-top: 10px; font-size: 16px; }
              .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Ollapos</div>
              <div class="subtitle">Pangkalan Bude Sri</div>
              <div class="subtitle">Jl. Merdeka No. 123, Jakarta</div>
            </div>

            <div class="info">
              <div><strong>No. Transaksi:</strong> ${transactionData.id}</div>
              <div><strong>Tanggal:</strong> ${formattedDateTime}</div>
              <div><strong>Kasir:</strong> Bude Sri</div>
              ${transactionData.customerName ? `<div><strong>Pelanggan:</strong> ${transactionData.customerName}</div>` : ""}
            </div>

            <div class="items">
              ${transactionData.items
                .map(
                  (item) => `
                <div class="item">
                  <span>${item.name} x${item.quantity}</span>
                  <span>${formatCurrency(item.subtotal)}</span>
                </div>
              `
                )
                .join("")}

              <div class="total">
                <div><strong>Total:</strong> ${formatCurrency(transactionData.total)}</div>
              </div>
            </div>

            <div class="info">
              <div><strong>Metode Pembayaran:</strong> ${transactionData.paymentMethod.toUpperCase()}</div>
              ${transactionData.cashReceived ? `<div><strong>Uang Diterima:</strong> ${formatCurrency(transactionData.cashReceived)}</div>` : ""}
              ${transactionData.changeAmount ? `<div><strong>Kembalian:</strong> ${formatCurrency(transactionData.changeAmount)}</div>` : ""}
            </div>

            <div class="footer">
              <div>Terima kasih atas kunjungan Anda!</div>
              <div>Barang yang sudah dibeli tidak dapat dikembalikan</div>
            </div>
          </body>
        </html>
      `

      printWindow.document.write(receiptContent)
      printWindow.document.close()
      printWindow.focus()

      setTimeout(() => {
        printWindow.print()
        printWindow.close()
        setIsPrinting(false)
      }, 500)
    }
  }

  const handleDownload = () => {
    const receiptContent = `
Ollapos - PANGKALAN BUDE SRI
==========================================
No. Transaksi: ${transactionData.id}
Tanggal: ${formattedDateTime}
Kasir: Bude Sri
${transactionData.customerName ? `Pelanggan: ${transactionData.customerName}` : ""}

------------------------------------------
RINCIAN PEMBELIAN (${totalItems} ITEM):
------------------------------------------
${transactionData.items
  .map(
    (item) =>
      `${item.name.padEnd(25)} ${item.quantity}x ${formatCurrency(item.price).padStart(12)}`
  )
  .join("\n")}

------------------------------------------
TOTAL: ${formatCurrency(transactionData.total).padStart(45)}
------------------------------------------

METODE PEMBAYARAN: ${transactionData.paymentMethod.toUpperCase()}
${transactionData.cashReceived ? `Uang Diterima: ${formatCurrency(transactionData.cashReceived)}` : ""}
${transactionData.changeAmount ? `Kembalian: ${formatCurrency(transactionData.changeAmount)}` : ""}

==========================================
Terima kasih atas kunjungan Anda!
Barang yang sudah dibeli tidak dapat dikembalikan
    `

    const blob = new Blob([receiptContent], { type: "text/plain" })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `struk-${transactionData.id}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-lg space-y-6">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="size-5" aria-hidden />
            <DialogTitle className="text-2xl font-semibold">Struk Pembayaran</DialogTitle>
          </div>
          <p className="text-sm text-secondary">Ollapos • Pangkalan Bude Sri</p>
        </DialogHeader>

        <div className="rounded-2xl border border-medium/70 bg-surface p-4 text-sm text-secondary shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">No. Transaksi</p>
              <p className="font-mono text-lg text-primary">{transactionData.id}</p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-semibold">
              {totalItems} item
            </Badge>
          </div>
          <div className="mt-4 grid gap-3 text-base text-primary sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Waktu</p>
              <p className="font-semibold">{formattedDateTime}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Pelanggan</p>
              <p className="font-semibold">{transactionData.customerName ?? "Tamu Umum"}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-secondary">
            Rincian Pembelian
          </h3>
          <ScrollArea className="mt-3 max-h-60 rounded-2xl border border-medium/60 bg-surface">
            <div className="space-y-4 p-4 text-base">
              {transactionData.items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-primary">{item.name}</p>
                    <p className="text-secondary">{item.quantity} × {formatCurrency(item.price)}</p>
                  </div>
                  <p className="text-right text-lg font-bold text-primary">
                    {formatCurrency(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-medium/70 bg-surface p-4 text-base text-secondary shadow-sm">
            <div className="flex items-center justify-between">
              <span>Metode Pembayaran</span>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-sm font-semibold uppercase text-primary">
                {PAYMENT_LABELS[transactionData.paymentMethod]}
              </Badge>
            </div>
            {transactionData.cashReceived !== undefined && (
              <div className="mt-3 flex items-center justify-between text-primary">
                <span>Uang Diterima</span>
                <span className="text-lg font-semibold">
                  {formatCurrency(transactionData.cashReceived)}
                </span>
              </div>
            )}
            {transactionData.changeAmount !== undefined && (
              <div className="mt-3 rounded-2xl bg-success-subtle px-4 py-3 text-center text-success">
                <p className="text-sm font-semibold uppercase tracking-wide">Kembalian</p>
                <p className="text-2xl font-bold">{formatCurrency(transactionData.changeAmount)}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-primary/40 bg-primary/5 px-4 py-5 text-primary">
            <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Total Pembayaran</p>
            <p className="text-3xl font-bold">{formatCurrency(transactionData.total)}</p>
          </div>
        </div>

        <DialogFooter className="!flex-col !items-stretch !gap-4">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
            <Button variant="outline" className="w-full touch-target-large text-base font-semibold" onClick={handleDownload}>
              <Download className="mr-2 size-4" aria-hidden />
              Download TXT
            </Button>
            <Button
              className="w-full touch-target-large text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handlePrint}
              disabled={isPrinting}
            >
              <Printer className="mr-2 size-4" aria-hidden />
              {isPrinting ? "Mencetak..." : "Cetak"}
            </Button>
          </div>
          <Button variant="ghost" className="w-full touch-target-large text-base" onClick={onClose}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}