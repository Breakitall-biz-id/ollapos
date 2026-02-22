'use client'

import { useCallback, useEffect, useState } from "react"
import {
  Receipt,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { NumericInput } from "@/components/ui/numeric-input"
import { Label } from "@/components/ui/label"
import { PageLoadingState } from "@/components/page-loading-state"
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
import { TablePageHeader } from "@/components/table-page-header"
import { TableEmptyState } from "@/components/table-empty-state"
import { SetupRequiredBanner } from "@/components/setup-required-banner"
import { TableSectionCard } from "@/components/table-section-card"

import {
  getExpensesForCurrentPangkalan,
  getExpenseCategories,
  initializeDefaultExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  type ExpenseListItem,
  type ExpenseCategoryItem,
} from "@/lib/actions/expenses"
import { getActivePangkalanCapitalBalance } from "@/lib/actions"
import { getExpenseCategoryPresentation } from "@/lib/expense-category-presentation"
import { formatCurrency } from "@/lib/utils"


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
  const [isInitializingCategories, setIsInitializingCategories] = useState(false)
  const [capitalBalance, setCapitalBalance] = useState(0)

  const [formData, setFormData] = useState<ExpenseFormData>({
    description: "",
    amount: "",
    categoryId: "",
    receiptNumber: "",
    notes: "",
    expenseDate: new Date().toISOString().split('T')[0],
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [expensesResult, categoriesResult, capitalResult] = await Promise.all([
        getExpensesForCurrentPangkalan({
          search: searchTerm || undefined,
          categoryId: selectedCategory !== "all" ? selectedCategory : undefined,
        }),
        getExpenseCategories(),
        getActivePangkalanCapitalBalance(),
      ])

      if (expensesResult.success) {
        setExpenses(expensesResult.data)
      } else {
        toast.error(expensesResult.error || "Gagal memuat data pengeluaran")
      }

      if (categoriesResult.success) {
        setCategories(categoriesResult.data)
        if (categoriesResult.data.length > 0) {
          const firstCategoryId = categoriesResult.data[0].id
          setFormData(prev => (prev.categoryId ? prev : { ...prev, categoryId: firstCategoryId }))
        }
      } else {
        toast.error(categoriesResult.error || "Gagal memuat kategori")
      }

      if (capitalResult.success) {
        setCapitalBalance(capitalResult.data.balance)
      }
    } catch (error) {
      console.error("Error loading expenses:", error)
      toast.error("Terjadi kesalahan saat memuat data")
    } finally {
      setLoading(false)
    }
  }, [searchTerm, selectedCategory])

  useEffect(() => {
    void loadData()
  }, [loadData])

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

  const renderCategoryOption = (category: ExpenseCategoryItem) => {
    const { Icon, color, name } = getExpenseCategoryPresentation(category)
    return (
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        <Icon className="h-4 w-4" aria-hidden />
        <span>{name}</span>
      </div>
    )
  }

  const handleInitializeCategories = async () => {
    setIsInitializingCategories(true)
    try {
      const result = await initializeDefaultExpenseCategories()
      if (!result.success) {
        throw new Error(result.error || "Gagal menginisialisasi kategori")
      }
      toast.success("Kategori default berhasil diinisialisasi")
      await loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menginisialisasi kategori")
    } finally {
      setIsInitializingCategories(false)
    }
  }

  if (loading) {
    return <PageLoadingState title="Memuat pengeluaran" />
  }

  return (
    <div className="table-page simple-page">
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <TablePageHeader
          title="Pengeluaran"
          subtitle="Kelola dan lacak semua pengeluaran bisnis Anda."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Cari pengeluaran..."
          rightContent={
            <>
              <Badge className="rounded-md border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                Total: {formatCurrency(totalExpenses)}
              </Badge>
              <Badge className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Saldo: {formatCurrency(capitalBalance)}
              </Badge>
              <DialogTrigger asChild>
                <Button className="rounded-lg px-6" disabled={categories.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Pengeluaran
                </Button>
              </DialogTrigger>
            </>
          }
        />
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">Tambah Pengeluaran Baru</DialogTitle>
            <DialogDescription className="text-sm text-secondary leading-relaxed">
              Catat pengeluaran operasional toko untuk memantau arus kas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
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
              <NumericInput
                id="amount"
                allowDecimal
                value={formData.amount}
                onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Kategori *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                disabled={categories.length === 0}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder={categories.length === 0 ? "Kategori belum tersedia" : "Pilih kategori"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {renderCategoryOption(category)}
                    </SelectItem>
                  ))}
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
          <Separator className="hidden md:block" />
          <DialogFooter className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="brand"
              className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TableSectionCard
        controls={
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-11 w-full rounded-lg border-medium/40 bg-white sm:w-48">
              <SelectValue placeholder="Semua Kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kategori</SelectItem>
              <Separator />
              {categories.map((category) => (
                <SelectItem key={`filter-${category.id}`} value={category.id}>
                  {renderCategoryOption(category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        topContent={
          categories.length === 0 ? (
            <SetupRequiredBanner
              className="rounded-2xl border border-warning/50 bg-warning-subtle p-4 text-warning"
              title="Kategori pengeluaran belum tersedia."
              description="Klik tombol di bawah untuk menginisialisasi kategori default."
              actionLabel="Inisialisasi Kategori Default"
              actionInProgressLabel="Menginisialisasi..."
              isLoading={isInitializingCategories}
              onAction={handleInitializeCategories}
            />
          ) : null
        }
        isEmpty={expenses.length === 0}
        emptyState={
          <TableEmptyState
            title="Belum ada pengeluaran"
            description="Tambahkan pengeluaran pertama untuk mulai melacak keuangan."
            icon={Receipt}
          />
        }
        footer={
          <>
            <span>Menampilkan {expenses.length} pengeluaran</span>
            <span>Total {formatCurrency(totalExpenses)}</span>
          </>
        }
      >
        <ScrollArea className="h-[70vh]">
          <div className="space-y-1 p-4">
            {expenses.map((expense) => {
              const category = getCategoryById(expense.categoryId)
              const categoryPresentation = category ? getExpenseCategoryPresentation(category) : null
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between rounded-lg border border-medium/40 bg-white p-4 transition-colors hover:bg-surface-secondary"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: categoryPresentation?.color || '#6B7280' }}
                    >
                      {categoryPresentation ? (
                        <categoryPresentation.Icon className="h-5 w-5" aria-hidden />
                      ) : (
                        <Receipt className="h-5 w-5" aria-hidden />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{expense.description}</p>
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        {category && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryPresentation?.name || category.name}
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
      </TableSectionCard>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-3xl font-semibold text-primary">Edit Pengeluaran</DialogTitle>
            <DialogDescription className="text-sm text-secondary leading-relaxed">
              Perbarui rincian pengeluaran operasional toko.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
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
              <NumericInput
                id="edit-amount"
                allowDecimal
                value={formData.amount}
                onValueChange={(value) => setFormData(prev => ({ ...prev, amount: value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-category">Kategori *</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, categoryId: value }))}
                disabled={categories.length === 0}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder={categories.length === 0 ? "Kategori belum tersedia" : "Pilih kategori"} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={`edit-${category.id}`} value={category.id}>
                      {renderCategoryOption(category)}
                    </SelectItem>
                  ))}
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
          <Separator className="hidden md:block" />
          <DialogFooter className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              variant="brand"
              className="h-12 w-full sm:w-auto rounded-lg px-6 text-base font-medium"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader className="space-y-3">
            <AlertDialogTitle className="text-2xl font-semibold text-primary">Hapus Pengeluaran</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-secondary">
              Apakah Anda yakin ingin menghapus pengeluaran &quot;{deletingExpense?.description}&quot; sebesar {deletingExpense && formatCurrency(parseFloat(deletingExpense.amount))}?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <AlertDialogCancel disabled={isSubmitting} className="h-12 w-full sm:w-auto rounded-lg border-medium/40 px-6 text-base font-semibold">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpense}
              disabled={isSubmitting}
              className="h-12 w-full sm:w-auto rounded-lg bg-destructive px-6 text-base font-semibold text-destructive-foreground hover:bg-destructive/90"
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
