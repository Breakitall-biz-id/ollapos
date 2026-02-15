'use server';

import { db } from '@/db';
import { transaction, transactionItem, inventory, customer, customerType, inventoryLog } from '@/db/schema/pos';
import { eq, and, inArray, gte, lt } from 'drizzle-orm';
import { resolvePangkalanContext } from '@/lib/server/pangkalan-context';

type ActionContextOptions = {
  pangkalanId?: string | null;
};

type DateRangeInput = {
  from?: string | Date | null;
  to?: string | Date | null;
};

type GroupedTransaction = {
  id: string;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  customerName: string | null;
  customerDiscountPercent: number;
  itemCount: number;
  createdAt: Date;
};

const toStartOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const toEndOfDay = (value: Date) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const resolveDateRange = (range?: DateRangeInput) => {
  const now = new Date();
  let start = range?.from ? toStartOfDay(new Date(range.from)) : toStartOfDay(now);
  let end = range?.to ? toEndOfDay(new Date(range.to)) : toEndOfDay(now);

  if (end < start) {
    const previousStart = start;
    start = toStartOfDay(new Date(range?.to ?? now));
    end = toEndOfDay(new Date(previousStart));
  }

  const endExclusive = toStartOfDay(new Date(end));
  endExclusive.setDate(endExclusive.getDate() + 1);

  return { start, end, endExclusive };
};

async function getContext(options?: ActionContextOptions) {
  return resolvePangkalanContext(options);
}

export async function createTransaction(data: {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
    costPrice?: number;
  }>;
  paymentMethod: 'cash' | 'qris' | 'kasbon';
  cashReceived?: number;
}, options?: ActionContextOptions) {
  try {
    const { pangkalan } = await getContext(options);
    const toMoney = (value: number) => Number(Number(value).toFixed(2));

    // Calculate totals
    const total = toMoney(data.items.reduce((sum, item) => sum + item.subtotal, 0));
    let totalCost = 0;
    let totalProfit = 0;

    // Generate transaction ID
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create transaction record
      const newTransaction = await tx.insert(transaction).values({
        id: transactionId,
        pangkalanId: pangkalan.id,
        customerId: data.customerId || null,
        totalAmount: total,
        totalCost: 0,
        totalProfit: 0,
        paymentMethod: data.paymentMethod,
        cashReceived: data.cashReceived || null,
        changeAmount: data.cashReceived ? data.cashReceived - total : null,
        status: 'paid',
        createdAt: new Date()
      }).returning();

      // Create transaction items
      for (const item of data.items) {
        console.log('Creating transaction item:', {
          item: item,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.subtotal
        });

        const unitCost = toMoney(item.costPrice ?? 0);
        const lineCost = toMoney(unitCost * item.quantity);
        const lineProfit = toMoney((item.price - unitCost) * item.quantity);
        totalCost += lineCost;
        totalProfit += lineProfit;

        await tx.insert(transactionItem).values({
          id: `txi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          transactionId,
          productId: item.productId,
          qty: item.quantity || 1,
          priceAtPurchase: item.price || 0,
          costAtPurchase: unitCost,
          subtotal: item.subtotal || 0,
          profit: lineProfit,
        });

        // Update inventory (decrease stock filled, increase stock empty)
        const inventoryRecord = await tx
          .select()
          .from(inventory)
          .where(and(
            eq(inventory.productId, item.productId),
            eq(inventory.pangkalanId, pangkalan.id)
          ))
          .limit(1);

        if (inventoryRecord.length > 0) {
          const currentStock = inventoryRecord[0].stockFilled || 0;
          const currentEmptyStock = inventoryRecord[0].stockEmpty || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          const newEmptyStock = currentEmptyStock + item.quantity; // Tabung kosong bertambah

          await tx
            .update(inventory)
            .set({
              stockFilled: newStock,
              stockEmpty: newEmptyStock,
              updatedAt: new Date()
            })
            .where(and(
              eq(inventory.productId, item.productId),
              eq(inventory.pangkalanId, pangkalan.id)
            ));

          // Create inventory log
          await tx.insert(inventoryLog).values({
            id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pangkalanId: pangkalan.id,
            productId: item.productId,
            qtyChangeFilled: -item.quantity, // Decrease filled stock
            qtyChangeEmpty: item.quantity,   // Increase empty stock
            type: 'sale',
            note: `Transaksi ${transactionId} - ${item.quantity} ${item.productId}`,
            transactionId,
            createdAt: new Date()
          });
        }
      }

      const totalsPayload = {
        totalCost: toMoney(totalCost),
        totalProfit: toMoney(totalProfit),
        changeAmount: data.cashReceived ? toMoney(data.cashReceived - total) : null,
      };

      await tx
        .update(transaction)
        .set(totalsPayload)
        .where(eq(transaction.id, transactionId));

      return { ...newTransaction[0], ...totalsPayload };
    });

    return {
      success: true,
      data: {
        id: result.id,
        total: result.totalAmount,
        paymentMethod: result.paymentMethod,
        changeAmount: result.changeAmount,
        createdAt: result.createdAt
      }
    };

  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create transaction',
      data: null
    };
  }
}

export async function getTransactionsToday(range?: DateRangeInput) {
  try {
    const { pangkalan } = await getContext();
    const { start, endExclusive, end } = resolveDateRange(range);

    // Get transaction IDs for today's transactions first
    const todayTxIds = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, pangkalan.id),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, start),
        lt(transaction.createdAt, endExclusive)
      ));

    if (todayTxIds.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Extract transaction IDs
    const txIds = todayTxIds.map(tx => tx.id);

    // Get full transaction data with customer and item details
    const fullTransactions = await db
      .select()
      .from(transaction)
      .leftJoin(customer, eq(transaction.customerId, customer.id))
      .leftJoin(customerType, eq(customer.typeId, customerType.id))
      .leftJoin(transactionItem, eq(transaction.id, transactionItem.transactionId))
      .where(inArray(transaction.id, txIds));

    // Group by transaction and aggregate item counts
    const groupedTransactions = fullTransactions.reduce<Record<string, GroupedTransaction>>((acc, row) => {
      const rowId = row.transaction?.id || '';
      if (!acc[rowId]) {
        acc[rowId] = {
          id: rowId,
          totalAmount: row.transaction?.totalAmount || 0,
          paymentMethod: row.transaction?.paymentMethod || 'cash',
          status: row.transaction?.status || 'paid',
          customerName: row.customer?.name || null,
          customerDiscountPercent: row.customer_type?.discountPercent || 0,
          itemCount: 0,
          createdAt: row.transaction?.createdAt || new Date()
        };
      }
      acc[rowId].itemCount += row.transaction_item?.qty || 0;
      return acc;
    }, {});

    const todayTransactions = Object.values(groupedTransactions);

    console.log('Today transactions for UI:', todayTransactions.length);

    return {
      success: true,
      data: todayTransactions,
      meta: {
        range: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
      },
    };

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch transactions',
      data: []
    };
  }
}

export async function getSalesSummary(range?: DateRangeInput) {
  try {
    const { pangkalan } = await getContext();
    const { start, end, endExclusive } = resolveDateRange(range);

    // Get today's transactions (exact same as working debug API)
    const todayTransactions = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, pangkalan.id),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, start),
        lt(transaction.createdAt, endExclusive)
      ));

    console.log('Today transactions found:', todayTransactions.length);

    // Calculate actual totals from today's transactions
    const transactionCount = todayTransactions.length;
    
    // Calculate total sales from all transactions
    const totalSales = todayTransactions.reduce((sum, tx) => {
      const amount = typeof tx.totalAmount === 'string' ? parseFloat(tx.totalAmount) : tx.totalAmount;
      return sum + (amount || 0);
    }, 0);

    const totalCost = todayTransactions.reduce((sum, tx) => {
      const value = typeof tx.totalCost === 'string' ? parseFloat(tx.totalCost) : tx.totalCost;
      return sum + (value || 0);
    }, 0);

    const totalProfit = todayTransactions.reduce((sum, tx) => {
      const value = typeof tx.totalProfit === 'string' ? parseFloat(tx.totalProfit) : tx.totalProfit;
      return sum + (value || 0);
    }, 0);

    // Get total items from transaction_item table
    let totalItems = 0;
    if (todayTransactions.length > 0) {
      const txIds = todayTransactions.map(tx => tx.id);
      const itemsResult = await db
        .select()
        .from(transactionItem)
        .where(inArray(transactionItem.transactionId, txIds));
      
      totalItems = itemsResult.reduce((sum, item) => sum + (item.qty || 0), 0);
    }

    console.log('Calculated summary:', { totalSales, totalItems, transactionCount });

    return {
      success: true,
      data: {
        totalSales,
        totalItems,
        transactionCount,
        totalCost,
        totalProfit,
        date: start.toISOString().split('T')[0],
        range: {
          from: start.toISOString(),
          to: end.toISOString(),
        },
      },
    };

  } catch (error) {
    console.error('Error fetching sales summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch sales summary',
      data: {
        totalSales: 0,
        totalItems: 0,
        transactionCount: 0,
        totalCost: 0,
        totalProfit: 0,
        date: new Date().toISOString().split('T')[0],
        range: {
          from: new Date().toISOString(),
          to: new Date().toISOString(),
        },
      }
    };
  }
}