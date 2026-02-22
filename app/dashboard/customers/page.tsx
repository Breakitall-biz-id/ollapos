'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { useCachedData } from '@/lib/stores/data-cache'
import { MapPin, Phone, Mail, Users, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { PageLoadingState } from '@/components/page-loading-state'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { TablePageHeader } from '@/components/table-page-header'
import { TableEmptyState } from '@/components/table-empty-state'
import { TableSectionCard } from '@/components/table-section-card'
import { cn, formatCurrency } from '@/lib/utils'
import {
  createCustomerForCurrentPangkalan,
  deleteCustomerForCurrentPangkalan,
  getCustomersForCurrentPangkalan,
  getCustomerTypes,
  updateCustomerForCurrentPangkalan,
} from '@/lib/actions'

interface Customer {
  id: string
  name: string
  phone: string | null
  email?: string | null
  address?: string | null
  typeId: string
  typeName: string | null
  displayName: string | null
  discountPercent: number | null
  color: string | null
  totalSpent: string | number | null
  notes?: string | null
}

interface CustomerType {
  id: string
  displayName: string
  discountPercent: number
  color?: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isProcessingDelete, setIsProcessingDelete] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    typeId: '',
    notes: '',
  })

  const customersCache = useCachedData<typeof customers>('customers')
  const didInit = useRef(false)

  // Load customers and types
  useEffect(() => {
    if (!didInit.current && customersCache.data && customersCache.isFresh) {
      didInit.current = true
      setCustomers(customersCache.data)
      setFilteredCustomers(customersCache.data)
      setLoading(false)
      // Still load types since they're lightweight
      getCustomerTypes().then(r => { if (r.success && r.data) setCustomerTypes(r.data) })
      return
    }
    didInit.current = true
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [customersResult, typesResult] = await Promise.all([
        getCustomersForCurrentPangkalan(),
        getCustomerTypes()
      ])

      if (customersResult.success && customersResult.data) {
        setCustomers(customersResult.data)
        setFilteredCustomers(customersResult.data)
        customersCache.setData(customersResult.data)
      }

      if (typesResult.success && typesResult.data) {
        setCustomerTypes(typesResult.data)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memuat data pelanggan')
    } finally {
      setLoading(false)
    }
  }

  // Filter customers
  useEffect(() => {
    let filtered = customers

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm)
      )
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(customer => customer.typeId === typeFilter)
    }

    setFilteredCustomers(filtered)
  }, [customers, searchTerm, typeFilter])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        typeId: formData.typeId,
        notes: formData.notes || undefined,
      }

      if (!customerData.name) {
        toast.error('Nama pelanggan wajib diisi')
        return
      }

      if (!customerData.typeId) {
        toast.error('Tipe pelanggan wajib dipilih')
        return
      }

      if (editingCustomer) {
        const result = await updateCustomerForCurrentPangkalan(editingCustomer.id, customerData)
        if (!result.success) {
          throw new Error(result.error || 'Gagal memperbarui pelanggan')
        }
        toast.success('Pelanggan berhasil diperbarui')
      } else {
        const result = await createCustomerForCurrentPangkalan(customerData)
        if (!result.success) {
          throw new Error(result.error || 'Gagal menambahkan pelanggan')
        }
        toast.success('Pelanggan berhasil ditambahkan')
      }

      // Reset form and refresh
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        typeId: '',
        notes: '',
      })
      setEditingCustomer(null)
      setIsAddModalOpen(false)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyimpan pelanggan')
    }
  }

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      typeId: customer.typeId,
      notes: customer.notes || '',
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteRequest = (customer: Customer) => {
    setDeleteTarget(customer)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    setIsProcessingDelete(true)

    try {
      const result = await deleteCustomerForCurrentPangkalan(deleteTarget.id)
      if (!result.success) {
        throw new Error(result.error || 'Gagal menghapus pelanggan')
      }
      toast.success('Pelanggan berhasil dihapus')
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus pelanggan')
    } finally {
      setIsProcessingDelete(false)
    }
  }

  const customerTypeSummary = useMemo(() => {
    return customerTypes.map((type) => ({
      ...type,
      total: customers.filter((customer) => customer.typeId === type.id).length,
    }))
  }, [customers, customerTypes])

  const filteredTypeCounts = useMemo(() => {
    return customerTypes.reduce(
      (acc, type) => {
        acc[type.id] = customers.filter((customer) => customer.typeId === type.id).length
        return acc
      },
      {} as Record<string, number>
    )
  }, [customers, customerTypes])

  if (loading) {
    return <PageLoadingState title="Memuat data pelanggan" />
  }

  return (
    <div className="table-page simple-page">
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <TablePageHeader
          title="Manajemen Pelanggan"
          subtitle="Kelola preferensi pelanggan, catatan kontak, dan tipe pelanggan di satu tempat."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari nama pelanggan atau nomor telepon"
          rightContent={
            <DialogTrigger asChild>
              <Button
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-6 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                onClick={() => {
                  setEditingCustomer(null)
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    typeId: customerTypes[0]?.id || '',
                    notes: '',
                  })
                }}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Tambah Pelanggan
              </Button>
            </DialogTrigger>
          }
        />
        <DialogContent className="max-w-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">
              {editingCustomer ? 'Perbarui Pelanggan' : 'Tambah Pelanggan Baru'}
            </DialogTitle>
            <DialogDescription className="text-sm text-secondary leading-relaxed">
              Simpan kontak pelanggan dengan catatan lengkap agar kasir tahu benefit khususnya.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-primary">
                  Nama Lengkap
                </Label>
                <Input
                  id="name"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-primary">
                  Nomor Telepon
                </Label>
                <Input
                  id="phone"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="08xx-xxxx-xxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-primary">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-semibold text-primary">
                  Alamat
                </Label>
                <Input
                  id="address"
                  className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="typeId" className="text-sm font-semibold text-primary">
                  Tipe Pelanggan
                </Label>
                <Select value={formData.typeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, typeId: value }))}>
                  <SelectTrigger className="h-12 w-full rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20">
                    <SelectValue placeholder="Pilih tipe pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    {customerTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.displayName} ({type.discountPercent}% diskon)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="notes" className="text-sm font-semibold text-primary">
                    Catatan
                  </Label>
                  <span className="text-xs font-medium uppercase tracking-[0.2em] text-muted">Opsional</span>
                </div>
                <Textarea
                  id="notes"
                  rows={3}
                  className="min-h-28 rounded-lg border-medium/40 bg-surface px-4 py-3 text-base shadow-sm transition focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                  placeholder="Catatan tambahan mengenai pelanggan"
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
            <Separator className="hidden md:block" />
            <DialogFooter className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium" onClick={() => setIsAddModalOpen(false)}>
                Batal
              </Button>
              <Button type="submit" variant="brand" className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium">
                {editingCustomer ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="table-stat-strip table-help-card">
        {customerTypeSummary.length === 0 ? (
          <Card className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] md:col-span-4">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">Pelanggan</p>
                <p className="text-lg font-semibold text-primary">Belum ada data tipe pelanggan</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          customerTypeSummary.map((type) => (
            <Card key={type.id} className="rounded-xl border border-medium/60 bg-white shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)]">
              <CardContent className="flex items-center justify-between gap-4 p-6">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-secondary">{type.displayName}</p>
                  <p className="text-3xl font-semibold text-primary">{type.total}</p>
                </div>
                <Badge variant="secondary" className="rounded-full border border-medium/40 bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-secondary">
                  {type.discountPercent}%
                </Badge>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <TableSectionCard
        controls={
          <>
            <button
              type="button"
              className={cn(
                "flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-all md:flex-none",
                typeFilter === 'all'
                  ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
              )}
              onClick={() => setTypeFilter('all')}
            >
              Semua Tipe
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  typeFilter === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {customers.length}
              </span>
            </button>
            {customerTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={cn(
                  "flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-5 py-2 text-sm font-medium transition-all md:flex-none",
                  typeFilter === type.id
                    ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
                )}
                onClick={() => setTypeFilter(type.id)}
              >
                {type.displayName}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px]",
                    typeFilter === type.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}
                >
                  {filteredTypeCounts[type.id] ?? 0}
                </span>
              </button>
            ))}
          </>
        }
        isEmpty={filteredCustomers.length === 0}
        emptyState={
          <TableEmptyState
            title="Belum ada pelanggan"
            description="Tambahkan data pelanggan untuk mulai melacak benefitnya."
            icon={Users}
          />
        }
        footer={
          <>
            <span>Menampilkan {filteredCustomers.length} pelanggan</span>
            <span>Kontak aktif</span>
          </>
        }
        footerClassName="hidden md:flex"
      >
        <>
          <div className="grid gap-3 p-3 md:hidden">
            {filteredCustomers.map((customer) => (
              <div key={`mobile-${customer.id}`} className="space-y-3 rounded-xl border border-medium/40 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-primary">{customer.name}</p>
                    {customer.address && <p className="text-sm text-secondary">{customer.address}</p>}
                  </div>
                  <Badge className="border border-primary/20 bg-primary/10 text-primary">
                    {customer.displayName ?? 'Umum'}
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-secondary">
                  {customer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted" aria-hidden />
                      {customer.email}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2">
                  <span className="text-sm text-secondary">Total belanja</span>
                  <span className="font-semibold text-primary">{formatCurrency(customer.totalSpent ?? 0)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg"
                    onClick={() => handleEdit(customer)}
                  >
                    <Edit2 className="h-4 w-4" aria-hidden />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => handleDeleteRequest(customer)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Table className="hidden bg-white text-sm md:table">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[280px] text-xs font-semibold uppercase tracking-widest text-secondary">Nama</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Tipe</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kontak</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Total Belanja</TableHead>
                <TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} className="transition">
                  <TableCell>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-primary">{customer.name}</p>
                      {customer.address && (
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {customer.address}
                        </div>
                      )}
                      {customer.notes && <p className="text-xs text-secondary italic">{customer.notes}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="border border-primary/20 bg-primary/10 text-primary">
                      {customer.displayName}
                    </Badge>
                    {(customer.discountPercent ?? 0) > 0 && (
                      <p className="text-xs font-medium text-success">{customer.discountPercent}% diskon</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 text-sm text-secondary">
                      {customer.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-muted" aria-hidden />
                          {customer.phone}
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-muted" aria-hidden />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {formatCurrency(customer.totalSpent ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit2 className="h-4 w-4" aria-hidden />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive"
                        onClick={() => handleDeleteRequest(customer)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      </TableSectionCard>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessingDelete) {
            setDeleteTarget(null)
          }
          setIsDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-2xl font-semibold text-primary">
              Hapus Pelanggan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-secondary">
              {deleteTarget ? (
                <span>
                  Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong>? Data pelanggan ini
                  akan hilang dari daftar.
                </span>
              ) : (
                'Apakah Anda yakin ingin menghapus pelanggan ini?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isProcessingDelete} className="h-11 rounded-lg border-medium/40 px-5 text-sm">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isProcessingDelete}
              className="h-11 rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessingDelete ? 'Menghapus…' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
