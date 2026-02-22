"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownCircle, ArrowUpCircle, Building2, CheckCircle2, Loader2, Wallet } from "lucide-react"
import { toast } from "sonner"

import { createCapitalEntry, getPangkalanCapitalBalances, getPangkalanSettings, setActivePangkalan } from "@/lib/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { PageLoadingState } from "@/components/page-loading-state"
import { TablePageHeader } from "@/components/table-page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

type PangkalanItem = {
  id: string
  name: string
  address: string | null
  phone: string | null
}

type CapitalSummaryItem = {
  pangkalanId: string
  pangkalanName: string
  totalIn: number
  totalOut: number
  balance: number
}

type CapitalForm = {
  pangkalanId: string
  type: "in" | "out"
  amount: string
  note: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [activePangkalanId, setActivePangkalanId] = useState<string | null>(null)
  const [roleLabel, setRoleLabel] = useState("staff")
  const [pangkalanList, setPangkalanList] = useState<PangkalanItem[]>([])
  const [capitalList, setCapitalList] = useState<CapitalSummaryItem[]>([])
  const [isSavingCapital, setIsSavingCapital] = useState(false)
  const [capitalForm, setCapitalForm] = useState<CapitalForm>({
    pangkalanId: "",
    type: "in",
    amount: "",
    note: "",
  })

  const loadSettings = async () => {
    setLoading(true)
    try {
      const [settingsResult, capitalResult] = await Promise.all([
        getPangkalanSettings(),
        getPangkalanCapitalBalances(),
      ])

      if (!settingsResult.success || !settingsResult.data) {
        throw new Error(settingsResult.error || "Gagal memuat data pangkalan")
      }

      setActivePangkalanId(settingsResult.data.activePangkalanId)
      setRoleLabel(settingsResult.data.role)
      setPangkalanList(settingsResult.data.pangkalanList)

      if (capitalResult.success && capitalResult.data) {
        setCapitalList(capitalResult.data.capitalList)
        setCapitalForm((prev) => ({
          ...prev,
          pangkalanId:
            prev.pangkalanId ||
            capitalResult.data.activePangkalanId ||
            settingsResult.data.activePangkalanId ||
            "",
        }))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat pengaturan")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const refreshCapitalOnly = async () => {
    const result = await getPangkalanCapitalBalances()
    if (result.success && result.data) {
      setCapitalList(result.data.capitalList)
    }
  }

  const handleSetActive = async (pangkalanId: string) => {
    setSavingId(pangkalanId)
    try {
      const result = await setActivePangkalan(pangkalanId)
      if (!result.success) {
        throw new Error(result.error || "Gagal mengganti pangkalan aktif")
      }

      setActivePangkalanId(pangkalanId)
      setCapitalForm((prev) => ({ ...prev, pangkalanId }))
      toast.success(`Pangkalan aktif diubah ke ${result.data?.name ?? "pilihan baru"}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengganti pangkalan")
    } finally {
      setSavingId(null)
    }
  }

  const handleCreateCapitalEntry = async () => {
    const parsedAmount = Number(capitalForm.amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Nominal modal harus lebih dari 0.")
      return
    }

    setIsSavingCapital(true)
    try {
      const result = await createCapitalEntry({
        pangkalanId: capitalForm.pangkalanId || undefined,
        type: capitalForm.type,
        amount: parsedAmount,
        note: capitalForm.note,
      })

      if (!result.success) {
        throw new Error(result.error || "Gagal menyimpan modal")
      }

      toast.success(`Modal berhasil disimpan untuk ${result.data?.pangkalanName ?? "pangkalan"}`)
      setCapitalForm((prev) => ({ ...prev, amount: "", note: "" }))
      await refreshCapitalOnly()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan modal")
    } finally {
      setIsSavingCapital(false)
    }
  }

  if (loading) {
    return <PageLoadingState title="Memuat pengaturan pangkalan" />
  }

  return (
    <div className="table-page simple-page">
      <TablePageHeader
        title="Pengaturan Pangkalan"
        subtitle="Pilih pangkalan aktif agar transaksi, stok, dan laporan mengarah ke outlet yang benar."
      />

      <Card className="table-list-card table-list-card-standalone">
        <CardHeader className="space-y-2 border-b border-medium/40 pb-6">
          <CardTitle className="text-2xl font-semibold text-primary">Daftar Pangkalan</CardTitle>
          <p className="text-sm text-secondary">
            Role akun saat ini: <span className="font-semibold uppercase text-primary">{roleLabel}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          {pangkalanList.length === 0 ? (
            <p className="text-sm text-secondary">Tidak ada pangkalan yang bisa diakses.</p>
          ) : (
            pangkalanList.map((item) => {
              const isActive = activePangkalanId === item.id
              const isSaving = savingId === item.id

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-medium/40 bg-surface p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-secondary" aria-hidden />
                      <p className="text-base font-semibold text-primary">{item.name}</p>
                      {isActive && (
                        <Badge className="border-success bg-success-subtle text-success">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                          Aktif
                        </Badge>
                      )}
                    </div>
                    {item.address && <p className="text-sm text-secondary">{item.address}</p>}
                    {item.phone && <p className="text-sm text-secondary">{item.phone}</p>}
                  </div>
                  <Button
                    type="button"
                    variant={isActive ? "secondary" : "default"}
                    className="h-11 rounded-lg px-5 text-sm font-semibold"
                    disabled={isActive || isSaving}
                    onClick={() => void handleSetActive(item.id)}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Menyimpan...
                      </>
                    ) : isActive ? (
                      "Sedang Aktif"
                    ) : (
                      "Jadikan Aktif"
                    )}
                  </Button>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Card className="table-control-card table-control-card-standalone">
        <CardHeader className="space-y-2 border-b border-medium/40 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-primary">
            <Wallet className="h-6 w-6" aria-hidden />
            Saldo Modal per Pangkalan
          </CardTitle>
          <p className="text-sm text-secondary">
            Catat modal masuk atau modal keluar agar saldo tiap pangkalan selalu terlihat.
          </p>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {capitalList.length === 0 ? (
            <p className="text-sm text-secondary">Belum ada data modal.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {capitalList.map((item) => (
                <div key={item.pangkalanId} className="rounded-xl border border-medium/40 bg-surface p-4">
                  <p className="text-base font-semibold text-primary">{item.pangkalanName}</p>
                  <p className="mt-2 text-2xl font-bold text-primary">{formatCurrency(item.balance)}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <ArrowUpCircle className="h-4 w-4" aria-hidden />
                      Masuk: {formatCurrency(item.totalIn)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700">
                      <ArrowDownCircle className="h-4 w-4" aria-hidden />
                      Keluar: {formatCurrency(item.totalOut)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-medium/40 bg-surface p-4">
            <p className="mb-4 text-sm font-semibold text-primary">Tambah Pergerakan Modal</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="capital-pangkalan">Pangkalan</Label>
                <Select
                  value={capitalForm.pangkalanId}
                  onValueChange={(value) => setCapitalForm((prev) => ({ ...prev, pangkalanId: value }))}
                >
                  <SelectTrigger id="capital-pangkalan" className="h-11 w-full">
                    <SelectValue placeholder="Pilih pangkalan" />
                  </SelectTrigger>
                  <SelectContent>
                    {pangkalanList.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capital-type">Tipe</Label>
                <Select
                  value={capitalForm.type}
                  onValueChange={(value) => setCapitalForm((prev) => ({ ...prev, type: value === "out" ? "out" : "in" }))}
                >
                  <SelectTrigger id="capital-type" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Modal Masuk</SelectItem>
                    <SelectItem value="out">Modal Keluar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capital-amount">Nominal (Rupiah)</Label>
                <NumericInput
                  id="capital-amount"
                  value={capitalForm.amount}
                  onValueChange={(value) => setCapitalForm((prev) => ({ ...prev, amount: value }))}
                  placeholder="Contoh: 500000"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capital-note">Catatan</Label>
                <Input
                  id="capital-note"
                  value={capitalForm.note}
                  onChange={(event) => setCapitalForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder="Opsional, misal: modal awal bulan"
                  className="h-11"
                />
              </div>
            </div>

            <div className="mt-4">
              <Button
                type="button"
                className="h-11 rounded-lg px-5 text-sm font-semibold"
                onClick={() => void handleCreateCapitalEntry()}
                disabled={isSavingCapital || !capitalForm.pangkalanId}
              >
                {isSavingCapital ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Modal"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
