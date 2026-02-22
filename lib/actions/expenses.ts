'use server';

import { nanoid } from 'nanoid';
import { db } from '@/db';
import { capitalEntry, expense, expenseCategory } from '@/db/schema/pos';
import type { Expense } from '@/db/schema/pos';
import { eq, and, ilike, desc, gte, lte } from 'drizzle-orm';
import { resolvePangkalanContext } from '@/lib/server/pangkalan-context';
import { ensureSufficientCapitalBalance } from '@/lib/actions/capital';

export type ExpenseListItem = {
  id: string;
  description: string;
  amount: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  receiptNumber: string | null;
  notes: string | null;
  expenseDate: string | null;
  createdAt: string | null;
};

export type ExpenseCategoryItem = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string | null;
};

const DEFAULT_EXPENSE_CATEGORIES = [
  {
    id: 'operational',
    name: 'Operasional',
    description: 'Biaya operasional sehari-hari',
    color: '#EF4444',
    icon: 'Settings',
  },
  {
    id: 'utilities',
    name: 'Utilitas',
    description: 'Tagihan listrik, air, internet',
    color: '#3B82F6',
    icon: 'Zap',
  },
  {
    id: 'maintenance',
    name: 'Pemeliharaan',
    description: 'Perawatan peralatan dan fasilitas',
    color: '#F59E0B',
    icon: 'Wrench',
  },
  {
    id: 'salary',
    name: 'Gaji',
    description: 'Penggajian karyawan',
    color: '#10B981',
    icon: 'Users',
  },
  {
    id: 'marketing',
    name: 'Pemasaran',
    description: 'Biaya promosi dan pemasaran',
    color: '#8B5CF6',
    icon: 'Megaphone',
  },
  {
    id: 'equipment',
    name: 'Peralatan',
    description: 'Pembelian peralatan dan perlengkapan',
    color: '#EC4899',
    icon: 'Package',
  },
  {
    id: 'rent',
    name: 'Sewa',
    description: 'Biaya sewa tempat usaha',
    color: '#F97316',
    icon: 'Home',
  },
  {
    id: 'tax',
    name: 'Pajak',
    description: 'Pembayaran pajak',
    color: '#06B6D4',
    icon: 'FileText',
  },
  {
    id: 'other',
    name: 'Lainnya',
    description: 'Biaya lainnya',
    color: '#6B7280',
    icon: 'MoreHorizontal',
  },
] as const;

export async function getExpensesForCurrentPangkalan(filters?: {
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}): Promise<{
  success: boolean;
  data: ExpenseListItem[];
  error?: string;
}> {
  try {
    const { pangkalan } = await resolvePangkalanContext();
    const conditions = [eq(expense.pangkalanId, pangkalan.id)];
    if (filters?.categoryId) {
      conditions.push(eq(expense.categoryId, filters.categoryId));
    }
    if (filters?.startDate) {
      conditions.push(gte(expense.expenseDate, filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(lte(expense.expenseDate, filters.endDate));
    }
    if (filters?.search) {
      conditions.push(ilike(expense.description, `%${filters.search}%`));
    }

    const expenses = await db
      .select({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        categoryId: expense.categoryId,
        categoryName: expenseCategory.name,
        categoryColor: expenseCategory.color,
        categoryIcon: expenseCategory.icon,
        receiptNumber: expense.receiptNumber,
        notes: expense.notes,
        expenseDate: expense.expenseDate,
        createdAt: expense.createdAt,
      })
      .from(expense)
      .innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
      .where(and(...conditions))
      .orderBy(desc(expense.expenseDate))
      .limit(100);

    return {
      success: true,
      data: expenses.map(expense => ({
        ...expense,
        amount: expense.amount.toString(),
        expenseDate: expense.expenseDate?.toISOString() || null,
        createdAt: expense.createdAt?.toISOString() || null,
      }))
    };
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return {
      success: false,
      data: [],
      error: 'Gagal memuat data pengeluaran. Mohon periksa koneksi database dan pastikan pangkalan aktif sudah dipilih dengan benar.'
    };
  }
}

export async function initializeDefaultExpenseCategories(): Promise<{
  success: boolean;
  insertedCount?: number;
  error?: string;
}> {
  try {
    const values = DEFAULT_EXPENSE_CATEGORIES.map((item) => ({
      ...item,
      createdAt: new Date(),
    }));

    await db.insert(expenseCategory).values(values).onConflictDoNothing();

    const totalRows = await db.query.expenseCategory.findMany({
      columns: { id: true },
    });

    return {
      success: true,
      insertedCount: totalRows.length,
    };
  } catch (error) {
    console.error('Error initializing default expense categories:', error);
    return {
      success: false,
      error: 'Gagal menginisialisasi kategori default pengeluaran.'
    };
  }
}

export async function getExpenseCategories(): Promise<{
  success: boolean;
  data: ExpenseCategoryItem[];
  error?: string;
}> {
  try {
    const categories = await db.query.expenseCategory.findMany({
      orderBy: expenseCategory.name,
    });

    return {
      success: true,
      data: categories.map(category => ({
        ...category,
        color: category.color || '#6B7280',
        icon: category.icon || 'FileText',
        createdAt: category.createdAt?.toISOString() || null,
      }))
    };
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    return {
      success: false,
      data: [],
      error: 'Gagal memuat kategori pengeluaran. Pastikan tabel kategori sudah tersedia dan data awal sudah diisi.'
    };
  }
}

export async function createExpense(data: {
  description: string;
  amount: number;
  categoryId: string;
  receiptNumber?: string;
  notes?: string;
  expenseDate?: Date;
}): Promise<{
  success: boolean;
  data?: Expense;
  error?: string;
}> {
  try {
    const { pangkalan } = await resolvePangkalanContext();
    const amount = Number(data.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Nominal pengeluaran harus lebih dari 0.'
      };
    }

    const category = await db.query.expenseCategory.findFirst({
      where: eq(expenseCategory.id, data.categoryId),
    });

    if (!category) {
      return {
        success: false,
        error: 'Kategori pengeluaran tidak ditemukan. Periksa data kategori terlebih dahulu.'
      };
    }

    await ensureSufficientCapitalBalance(pangkalan.id, amount);

    const now = new Date();
    const newExpense = {
      id: nanoid(),
      pangkalanId: pangkalan.id,
      description: data.description,
      amount: amount.toString(),
      categoryId: data.categoryId,
      receiptNumber: data.receiptNumber || null,
      notes: data.notes || null,
      expenseDate: data.expenseDate || now,
      createdAt: now,
      updatedAt: now,
    };

    const [createdExpense] = await db.transaction(async (tx) => {
      const [insertedExpense] = await tx.insert(expense).values(newExpense).returning();

      await tx.insert(capitalEntry).values({
        id: nanoid(),
        pangkalanId: pangkalan.id,
        type: 'out',
        amount: amount.toFixed(2),
        note: `AUTO:PENGELUARAN:${insertedExpense.description}`,
        createdAt: now,
      });

      return [insertedExpense];
    });

    return {
      success: true,
      data: createdExpense,
    };
  } catch (error) {
    console.error('Error creating expense:', error);
    return {
      success: false,
      error: 'Gagal menambahkan pengeluaran. Pastikan semua data terisi dengan benar.'
    };
  }
}

export async function updateExpense(id: string, data: {
  description?: string;
  amount?: number;
  categoryId?: string;
  receiptNumber?: string;
  notes?: string;
  expenseDate?: Date;
}): Promise<{
  success: boolean;
  data?: Expense;
  error?: string;
}> {
  try {
    const { pangkalan } = await resolvePangkalanContext();

    const existingExpense = await db.query.expense.findFirst({
      where: and(
        eq(expense.id, id),
        eq(expense.pangkalanId, pangkalan.id)
      ),
    });

    if (!existingExpense) {
      return {
        success: false,
        error: 'Pengeluaran tidak ditemukan. Mungkin telah dihapus.'
      };
    }

    const previousAmount = Number(existingExpense.amount ?? 0);
    const nextAmount = data.amount !== undefined ? Number(data.amount) : previousAmount;
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      return {
        success: false,
        error: 'Nominal pengeluaran harus lebih dari 0.'
      };
    }

    const deltaAmount = Number((nextAmount - previousAmount).toFixed(2));
    if (deltaAmount > 0) {
      await ensureSufficientCapitalBalance(pangkalan.id, deltaAmount);
    }

    const updateData: Partial<Expense> = {
      updatedAt: new Date(),
    };

    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = nextAmount.toString();
    if (data.categoryId !== undefined) {
      const category = await db.query.expenseCategory.findFirst({
        where: eq(expenseCategory.id, data.categoryId),
      });
      if (!category) {
        return {
          success: false,
          error: 'Kategori pengeluaran tidak ditemukan. Periksa data kategori terlebih dahulu.'
        };
      }
      updateData.categoryId = data.categoryId;
    }
    if (data.receiptNumber !== undefined) updateData.receiptNumber = data.receiptNumber;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.expenseDate !== undefined) updateData.expenseDate = data.expenseDate;

    const now = new Date();
    const [updatedExpense] = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(expense)
        .set(updateData)
        .where(eq(expense.id, id))
        .returning();

      if (deltaAmount > 0) {
        await tx.insert(capitalEntry).values({
          id: nanoid(),
          pangkalanId: pangkalan.id,
          type: 'out',
          amount: deltaAmount.toFixed(2),
          note: `AUTO:PENGELUARAN:ADJUST_PLUS:${updated.description}`,
          createdAt: now,
        });
      } else if (deltaAmount < 0) {
        await tx.insert(capitalEntry).values({
          id: nanoid(),
          pangkalanId: pangkalan.id,
          type: 'in',
          amount: Math.abs(deltaAmount).toFixed(2),
          note: `AUTO:PENGELUARAN:ADJUST_MINUS:${updated.description}`,
          createdAt: now,
        });
      }

      return [updated];
    });

    return {
      success: true,
      data: updatedExpense,
    };
  } catch (error) {
    console.error('Error updating expense:', error);
    return {
      success: false,
      error: 'Gagal memperbarui pengeluaran. Silakan coba kembali.'
    };
  }
}

export async function deleteExpense(id: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { pangkalan } = await resolvePangkalanContext();

    const existingExpense = await db.query.expense.findFirst({
      where: and(
        eq(expense.id, id),
        eq(expense.pangkalanId, pangkalan.id)
      ),
    });

    if (!existingExpense) {
      return {
        success: false,
        error: 'Pengeluaran tidak ditemukan. Mungkin telah dihapus.'
      };
    }

    const amount = Number(existingExpense.amount ?? 0);
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.delete(expense).where(eq(expense.id, id));

      if (amount > 0) {
        await tx.insert(capitalEntry).values({
          id: nanoid(),
          pangkalanId: pangkalan.id,
          type: 'in',
          amount: amount.toFixed(2),
          note: `AUTO:PENGELUARAN:DELETE_REVERSAL:${existingExpense.description}`,
          createdAt: now,
        });
      }
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting expense:', error);
    return {
      success: false,
      error: 'Gagal menghapus pengeluaran. Silakan coba kembali.'
    };
  }
}

export async function getExpenseSummary(pangkalanId?: string, startDate?: Date, endDate?: Date): Promise<{
  success: boolean;
  data: {
    totalExpenses: number;
    expensesByCategory: Array<{
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      totalAmount: number;
      count: number;
    }>;
  };
  error?: string;
}> {
  try {
    let targetPangkalanId = pangkalanId;
    if (!targetPangkalanId) {
      ({ pangkalan: { id: targetPangkalanId } } = await resolvePangkalanContext());
    }
    const conditions = [eq(expense.pangkalanId, targetPangkalanId)];
    if (startDate) {
      conditions.push(gte(expense.expenseDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(expense.expenseDate, endDate));
    }

    const expenses = await db
      .select({
        categoryId: expense.categoryId,
        categoryName: expenseCategory.name,
        categoryColor: expenseCategory.color,
        categoryIcon: expenseCategory.icon,
        totalAmount: expense.amount,
        count: expense.id,
      })
      .from(expense)
      .innerJoin(expenseCategory, eq(expense.categoryId, expenseCategory.id))
      .where(and(...conditions));

    const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.totalAmount), 0);

    const expensesByCategory = expenses.reduce((acc, expense) => {
      const key = expense.categoryId;
      if (!acc[key]) {
        acc[key] = {
          categoryId: expense.categoryId,
          categoryName: expense.categoryName,
          categoryColor: expense.categoryColor || '#6B7280',
          categoryIcon: expense.categoryIcon || 'FileText',
          totalAmount: 0,
          count: 0,
        };
      }
      acc[key].totalAmount += Number(expense.totalAmount);
      acc[key].count += 1;
      return acc;
    }, {} as Record<string, {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      totalAmount: number;
      count: number;
    }>);

    return {
      success: true,
      data: {
        totalExpenses,
        expensesByCategory: Object.values(expensesByCategory),
      },
    };
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    return {
      success: false,
      data: { totalExpenses: 0, expensesByCategory: [] },
      error: 'Gagal memuat ringkasan pengeluaran'
    };
  }
}
