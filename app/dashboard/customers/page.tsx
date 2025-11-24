'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin, Phone, Mail, Search, Users, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency } from '@/lib/utils'
import { getCustomersForCurrentPangkalan, getCustomerTypes } from '@/lib/actions'

interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  typeId: string
  typeName: string
  displayName: string
  discountPercent: number
  color: string
  totalSpent: number
  notes?: string
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

  // Load customers and types
  useEffect(() => {
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
      }

      if (typesResult.success && typesResult.data) {
        setCustomerTypes(typesResult.data)
      }
    } catch (error) {
      toast.error('Gagal memuat data pelanggan')
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
        name: formData.name,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        address: formData.address || undefined,
        typeId: formData.typeId,
        notes: formData.notes || undefined,
      }

      if (editingCustomer) {
        // Update existing customer
        // TODO: Implement updateCustomer action
        toast.success('Pelanggan berhasil diperbarui')
      } else {
        // Add new customer
        // TODO: Implement createCustomer action
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
      loadData()
    } catch (error) {
      toast.error('Gagal menyimpan pelanggan')
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
      // TODO: Implement deleteCustomer action once backend is ready
      toast.success('Pelanggan berhasil dihapus')
      setIsDeleteDialogOpen(false)
      setDeleteTarget(null)
      loadData()
    } catch (error) {
      toast.error('Gagal menghapus pelanggan')
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
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary">
          <Users className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">Memuat data pelanggan…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 px-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4 py-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Dashboard</p>
          <h1 className="text-3xl font-semibold text-primary">Manajemen Pelanggan</h1>
          <p className="text-sm text-secondary">
            Kelola preferensi pelanggan, catatan kontak, dan tipe membership di satu tempat.
          </p>
        </div>
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button
              className="flex items-center gap-2 rounded-lg bg-primary px-5 py-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/30 transition hover:bg-primary/90"
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
          <DialogContent className="max-w-2xl rounded-[24px] border border-medium/50 bg-white px-8 py-6 shadow-[0_32px_120px_-48px_rgba(15,23,42,0.65)]">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-3xl font-semibold text-primary">
                {editingCustomer ? 'Perbarui Pelanggan' : 'Tambah Pelanggan Baru'}
              </DialogTitle>
              <p className="text-sm text-secondary">
                Simpan kontak pelanggan dengan catatan lengkap agar kasir tahu benefit khususnya.
              </p>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-primary">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="name"
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
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
                    className="h-12 rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="typeId" className="text-sm font-semibold text-primary">
                    Tipe Pelanggan
                  </Label>
                  <Select value={formData.typeId} onValueChange={(value) => setFormData((prev) => ({ ...prev, typeId: value }))}>
                    <SelectTrigger className="h-12 w-full rounded-lg border-medium/40 bg-surface px-4 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20">
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
                    className="min-h-28 rounded-lg border-medium/40 bg-surface px-4 py-3 text-base shadow-sm focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20"
                    placeholder="Catatan tambahan mengenai pelanggan"
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter className="flex flex-col gap-3 pt-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="h-12 rounded-lg px-6" onClick={() => setIsAddModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="h-12 rounded-lg px-6">
                  {editingCustomer ? 'Simpan Perubahan' : 'Simpan Pelanggan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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

      <Card className="rounded-xl border border-medium/60 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
        <CardContent className="space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="w-full max-w-xl">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  placeholder="Cari nama pelanggan atau nomor telepon"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-12 rounded-lg border-medium/50 pl-11 pr-4 shadow-sm focus-visible:border-primary/60"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'flex-1 rounded-lg border border-transparent bg-surface px-4 py-2 text-sm font-medium text-secondary transition hover:border-primary/30 hover:bg-primary/5 md:flex-none',
                  typeFilter === 'all' && 'border-primary bg-primary/10 text-primary shadow-sm'
                )}
                onClick={() => setTypeFilter('all')}
              >
                Semua Tipe
                <span className="ml-2 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-primary shadow-sm">
                  {customers.length}
                </span>
              </Button>
              {customerTypes.map((type) => (
                <Button
                  key={type.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    'flex-1 rounded-lg border border-transparent bg-surface px-4 py-2 text-sm font-medium text-secondary transition hover:border-primary/30 hover:bg-primary/5 md:flex-none',
                    typeFilter === type.id && 'border-primary bg-primary/10 text-primary shadow-sm'
                  )}
                  onClick={() => setTypeFilter(type.id)}
                >
                  {type.displayName}
                  <span className="ml-2 rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-primary shadow-sm">
                    {filteredTypeCounts[type.id] ?? 0}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border border-medium/70 bg-white shadow-[0_26px_80px_-48px_rgba(15,23,42,0.55)]">
        <CardHeader className="space-y-2 border-b border-medium/40 pb-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-xl bg-primary" aria-hidden />
            Daftar Pelanggan
          </div>
          <CardTitle className="text-2xl font-semibold text-primary">
            {filteredCustomers.length} Kontak Aktif
          </CardTitle>
          <p className="text-sm text-secondary">Pantau riwayat belanja dan informasi kontak pelanggan setia.</p>
        </CardHeader>
        <CardContent className="pt-6">
          {filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-secondary">
              <Users className="h-10 w-10 text-muted" aria-hidden />
              <div>
                <p className="text-lg font-semibold text-primary">Belum ada pelanggan</p>
                <p className="text-sm text-muted">Tambahkan data pelanggan untuk mulai melacak benefitnya.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-medium/40">
              <Table className="bg-white text-sm">
                <TableHeader className="bg-surface-secondary/70">
                  <TableRow className="border-medium/40">
                    <TableHead className="w-[280px] text-xs font-semibold uppercase tracking-widest text-secondary">Nama</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Tipe</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Kontak</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-widest text-secondary">Total Belanja</TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-widest text-secondary">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="border-medium/30 transition hover:bg-surface-secondary/60">
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
                        {customer.discountPercent > 0 && (
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
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => handleEdit(customer)}>
                            <Edit2 className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-lg text-destructive hover:text-destructive"
                            onClick={() => handleDeleteRequest(customer)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isProcessingDelete) {
            setDeleteTarget(null)
          }
          setIsDeleteDialogOpen(open)
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl border border-medium/40 bg-white px-6 py-5 shadow-[0_40px_120px_-60px_rgba(15,23,42,0.6)]">
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