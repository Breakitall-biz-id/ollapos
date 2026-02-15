'use client'

import { useEffect, useMemo, useState } from "react"
import {
  CalendarDays,
  FileText,
  Receipt,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Loader2,
  Package,
  HomeIcon,
  Settings,
  Zap,
  Wrench,
  User,
  Megaphone,
  Users,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

import {
  getExpensesForCurrentPangkalan,
  getExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseListItem,
  type ExpenseCategoryItem,
} from "@/lib/actions/expenses"
import { formatCurrency } from "@/lib/utils"
import Home from "@/app/page"

type ExpenseFormData = {
  description: string
  amount: string
  categoryId: string
  receiptNumber: string
  notes: string
  expenseDate: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([])
  const [categories, setCategories] = useState<ExpenseCategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingExpense, setDeletingExpense] = useState<ExpenseListItem | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: "",
    categoryId: "",
    receiptNumber: "",
    notes: "",
    expenseDate: new Date().toISOString().split('T')[0],
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [expensesResult, categoriesResult] = await Promise.all([
        getExpensesForCurrentPangkalan({
          search: searchTerm || undefined,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
        }),
        getExpenseCategories(),
      ])

      if (expensesResult.success) {
        setExpenses(expensesResult.data)
      } else {
        toast.error(expensesResult.error || "Gagal memuat data pengeluaran")
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data)
        if (categoriesResult.data.length > 0 && !formData.categoryId) {
          setFormData(prev => ({ ...prev, categoryId: categoriesResult.data[0].id }))
        }
      } else {
        toast.error(categoriesResult.error || "Gagal memuat kategori")
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [searchTerm, selectedCategory])

  const resetFormData = () => {
    setFormData({
      description: "",
      amount: "",
      categoryId: categories[0]?.id || "",
      receiptNumber: "",
      notes: "",
      expenseDate: new Date().toISOString().split('T')[0],
    })
  }

  const handleCreateExpense = async () => {
    if (!formData.description || !formData.amount || !formData.categoryId) {
      toast.error("Mohon lengkapi semua field yang wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await createExpense({
        description: formData.description,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        receiptNumber: formData.receiptNumber || undefined,
        notes: formData.notes || undefined,
        expenseDate: new Date(formData.expenseDate),
      })

      if (result.success) {
        toast.success("Pengeluaran berhasil ditambahkan")
        setIsCreateDialogOpen(false)
        resetFormData()
        await loadData()
      } else {
        toast.error(result.error || "Gagal menambahkan pengeluaran")
      }
    } catch (error) {
      console.error("Error creating expense:", error)
      toast.error("Terjadi kesalahan saat menambahkan pengeluaran")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense || !formData.description || !formData.amount || !formData.categoryId) {
      toast.error("Mohon lengkapi semua field yang wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateExpense(editingExpense.id, {
        description: formData.description,
        amount: parseFloat(formData.amount),
        categoryId: formData.categoryId,
        receiptNumber: formData.receiptNumber || undefined,
        notes: formData.notes || undefined,
        expenseDate: new Date(formData.expenseDate),
      })

      if (result.success) {
        toast.success("Pengeluaran berhasil diperbarui")
        setIsEditDialogOpen(false)
        setEditingExpense(null)
        resetFormData()
        await loadData()
      } else {
        toast.error(result.error || "Gagal memperbarui pengeluaran")
      }
    } catch (error) {
      console.error("Error updating expense:", error)
      toast.error("Terjadi kesalahan saat memperbarui pengeluaran")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deletingExpense) return

    setIsSubmitting(true)
    try {
      const result = await deleteExpense(deletingExpense.id)
      if (result.success) {
        toast.success("Pengeluaran berhasil dihapus")
        setIsDeleteDialogOpen(false)
        setDeletingExpense(null)
        await loadData()
      } else {
        toast.error(result.error || "Gagal menghapus pengeluaran")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      toast.error("Terjadi kesalahan saat menghapus pengeluaran")
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (expense: ExpenseListItem) => {
    setEditingExpense(expense)
    setFormData({
      description: expense.description,
      amount: expense.amount,
      categoryId: expense.categoryId,
      receiptNumber: expense.receiptNumber || "",
      notes: expense.notes || "",
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (expense: ExpenseListItem) => {
    setDeletingExpense(expense)
    setIsDeleteDialogOpen(true)
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0)

  const getCategoryById = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-14 w-14 animate-spin text-primary" aria-hidden />
          <h2 className="text-2xl font-semibold text-primary">Memuat Pengeluaran</h2>
          <p className="text-secondary">Mohon tunggu sesaat…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[32px] border border-white/60 bg-gradient-to-br from-white via-white to-[#F2F4FF] p-6 shadow-[0_40px_120px_-80px_rgba(15,23,42,0.8)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-secondary">Keuangan</p>
              <h1 className="text-3xl font-semibold leading-tight text-primary lg:text-4xl">Pengeluaran</h1>
              <p className="text-sm text-secondary">Kelola dan lacak semua pengeluaran bisnis Anda</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="rounded-full border border-primary/10 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Total: {formatCurrency(totalExpenses)}
              </Badge>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-full px-6">
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Pengeluaran
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md space-y-6">
                  <DialogHeader>
                    <DialogTitle>Tambah Pengeluaran Baru</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="description">Deskripsi *</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Mis: Beli ATK kantor"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Jumlah *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Kategori *</Label>
                      <Select
                        value={formData.categoryId}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operational">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-red-500" />
                              <Settings className="h-4 w-4 text-red-500" />
                              <span>Operasional</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="utilities">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-blue-500" />
                              <Zap className="h-4 w-4 text-blue-500" />
                              <span>Utilitas</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="maintenance">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-yellow-500" />
                              <Wrench className="h-4 w-4 text-yellow-500" />
                              <span>Pemeliharaan</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="salary">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-green-500" />
                              <Users className="h-4 w-4 text-green-500" />
                              <span>Gaji</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="marketing">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-purple-500" />
                              <Megaphone className="h-4 w-4 text-purple-500" />
                              <span>Pemasaran</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="equipment">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-pink-500" />
                              <Package className="h-4 w-4 text-pink-500" />
                              <span>Peralatan</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="rent">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-orange-500" />
                              <HomeIcon className="h-4 w-4 text-orange-500" />
                              <span>Sewa</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="tax">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-cyan-500" />
                              <FileText className="h-4 w-4 text-cyan-500" />
                              <span>Pajak</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="other">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full bg-gray-500" />
                              <MoreHorizontal className="h-4 w-4 text-gray-500" />
                              <span>Lainnya</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="receiptNumber">Nomor Resi</Label>
                      <Input
                        id="receiptNumber"
                        value={formData.receiptNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                        placeholder="Opsional"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Tanggal</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={formData.expenseDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Catatan</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Catatan tambahan (opsional)"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      variant="outline"
                      className="sm:min-w-[160px]"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Batal
                    </Button>
                    <Button
                      className="sm:min-w-[200px]"
                      onClick={handleCreateExpense}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Menyimpan…
                        </>
                      ) : (
                        "Simpan Pengeluaran"
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari pengeluaran..."
                className="h-12 rounded-2xl border-medium/40 bg-white pl-11 text-base"
              />
            </div>
            <div className="flex gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="h-12 w-full rounded-2xl border-medium/40 bg-white sm:w-48">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <Separator />
                  <SelectItem value="operational">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <Settings className="h-4 w-4 text-red-500" />
                      <span>Operasional</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="utilities">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span>Utilitas</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <Wrench className="h-4 w-4 text-yellow-500" />
                      <span>Pemeliharaan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="salary">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <Users className="h-4 w-4 text-green-500" />
                      <span>Gaji</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="marketing">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      <Megaphone className="h-4 w-4 text-purple-500" />
                      <span>Pemasaran</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="equipment">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-pink-500" />
                      <Package className="h-4 w-4 text-pink-500" />
                      <span>Peralatan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rent">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                      <HomeIcon className="h-4 w-4 text-orange-500" />
                      <span>Sewa</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tax">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-cyan-500" />
                      <FileText className="h-4 w-4 text-cyan-500" />
                      <span>Pajak</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-500" />
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      <span>Lainnya</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[32px] border border-white/60 bg-white shadow-[0_40px_120px_-80px_rgba(15,23,42,0.8)]">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-primary">Daftar Pengeluaran</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-medium/40 bg-surface-tertiary/80 p-12 text-center text-secondary">
                <Receipt className="mb-4 h-16 w-16 text-muted" aria-hidden />
                <p className="text-lg font-medium text-primary">Belum ada pengeluaran</p>
                <p className="text-sm">Tambahkan pengeluaran pertama untuk mulai melacak keuangan</p>
              </div>
            ) : (
              <ScrollArea className="h-[70vh]">
                <div className="space-y-1 p-6">
                  {expenses.map((expense) => {
                    const category = getCategoryById(expense.categoryId)
                    return (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between rounded-2xl border border-medium/40 bg-surface p-4 transition-colors hover:bg-surface-secondary"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                            style={{ backgroundColor: category?.color || '#6B7280' }}
                          >
                            <Receipt className="h-5 w-5" aria-hidden />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-primary">{expense.description}</p>
                            <div className="flex items-center gap-2 text-sm text-secondary">
                              {category && (
                                <Badge variant="secondary" className="text-xs">
                                  {category.name}
                                </Badge>
                              )}
                              {expense.expenseDate && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(expense.expenseDate).toLocaleDateString('id-ID')}</span>
                                </>
                              )}
                              {expense.receiptNumber && (
                                <>
                                  <span>•</span>
                                  <span>Resi: {expense.receiptNumber}</span>
                                </>
                              )}
                            </div>
                            {expense.notes && (
                              <p className="mt-1 text-sm text-secondary">{expense.notes}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold text-primary">{formatCurrency(parseFloat(expense.amount))}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openEditDialog(expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(expense)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md space-y-6">
          <DialogHeader>
            <DialogTitle>Edit Pengeluaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-description">Deskripsi *</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Masukkan deskripsi"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Jumlah *</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
              >
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operational">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <Settings className="h-4 w-4 text-red-500" />
                      <span>Operasional</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="utilities">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span>Utilitas</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="maintenance">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <Wrench className="h-4 w-4 text-yellow-500" />
                      <span>Pemeliharaan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="salary">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <User className="h-4 w-4 text-green-500" />
                      <span>Gaji</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="marketing">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-purple-500" />
                      <Megaphone className="h-4 w-4 text-purple-500" />
                      <span>Pemasaran</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="equipment">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-pink-500" />
                      <Package className="h-4 w-4 text-pink-500" />
                      <span>Peralatan</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rent">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500" />
                      <Home className="h-4 w-4 text-orange-500" />
                      <span>Sewa</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="tax">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-cyan-500" />
                      <FileText className="h-4 w-4 text-cyan-500" />
                      <span>Pajak</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="other">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-500" />
                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                      <span>Lainnya</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-receiptNumber">Nomor Resi</Label>
              <Input
                id="edit-receiptNumber"
                value={formData.receiptNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                placeholder="Opsional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-expenseDate">Tanggal</Label>
              <Input
                id="edit-expenseDate"
                type="date"
                value={formData.expenseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Catatan</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                rows={3}
              />
            </div>
          </div>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="sm:min-w-[160px]"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              className="sm:min-w-[200px]"
              onClick={handleUpdateExpense}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan…
                </>
              ) : (
                "Simpan Perubahan"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengeluaran</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengeluaran "{deletingExpense?.description}" sebesar {deletingExpense && formatCurrency(parseFloat(deletingExpense.amount))}?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menghapus…
                </>
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}