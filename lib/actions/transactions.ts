'use server';

import { db } from '@/db';
import { transaction, transactionItem, inventory, product, customer, customerType, inventoryLog } from '@/db/schema/pos';
import { eq, and, desc, inArray, gte, lt } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { cookies } from 'next/headers';

// Helper function to get current session
async function getCurrentSession() {
  try {
    const cookieStore = await cookies();
    const session = await auth.api.getSession({
      headers: {
        cookie: cookieStore.toString()
      }
    });
    return session;
  } catch (error) {
    console.error('Session error:', error);
    return null;
  }
}

export async function createTransaction(data: {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  paymentMethod: 'cash' | 'qris' | 'kasbon';
  cashReceived?: number;
}) {
  try {
    // TEMPORARY: Hardcode pangkalan ID to test database connection
    // TODO: Fix session authentication later
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Calculate total
    const total = data.items.reduce((sum, item) => sum + item.subtotal, 0);

    // Generate transaction ID
    const transactionId = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Create transaction record
      const newTransaction = await tx.insert(transaction).values({
        id: transactionId,
        pangkalanId: hardcodedPangkalanId,
        customerId: data.customerId || null,
        totalAmount: total,
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

        await tx.insert(transactionItem).values({
          id: `txi-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          transactionId,
          productId: item.productId,
          qty: item.quantity || 1,
          priceAtPurchase: item.price || 0,
          subtotal: item.subtotal || 0
        });

        // Update inventory (decrease stock filled, increase stock empty)
        const inventoryRecord = await tx
          .select()
          .from(inventory)
          .where(and(
            eq(inventory.productId, item.productId),
            eq(inventory.pangkalanId, hardcodedPangkalanId)
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
              eq(inventory.pangkalanId, hardcodedPangkalanId)
            ));

          // Create inventory log
          await tx.insert(inventoryLog).values({
            id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            pangkalanId: hardcodedPangkalanId,
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

      return newTransaction[0];
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

export async function getTransactionsToday() {
  try {
    // TEMPORARY: Hardcode pangkalan ID to test database connection
    // TODO: Fix session authentication later
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Get today's transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get transaction IDs for today's transactions first
    const todayTxIds = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, hardcodedPangkalanId),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, today),
        lt(transaction.createdAt, tomorrow)
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
    const groupedTransactions = fullTransactions.reduce((acc, row) => {
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
    }, {} as Record<string, any>);

    const todayTransactions = Object.values(groupedTransactions);

    console.log('Today transactions for UI:', todayTransactions.length);

    return {
      success: true,
      data: todayTransactions
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

export async function getSalesSummary() {
  try {
    // TEMPORARY: Hardcode pangkalan ID to test database connection
    // TODO: Fix session authentication later
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's transactions (exact same as working debug API)
    const todayTransactions = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, hardcodedPangkalanId),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, today),
        lt(transaction.createdAt, tomorrow)
      ));

    console.log('Today transactions found:', todayTransactions.length);

    // Calculate actual totals from today's transactions
    const transactionCount = todayTransactions.length;
    
    // Calculate total sales from all transactions
    const totalSales = todayTransactions.reduce((sum, tx) => {
      const amount = typeof tx.totalAmount === 'string' ? parseFloat(tx.totalAmount) : tx.totalAmount;
      return sum + (amount || 0);
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
        date: today.toISOString().split('T')[0]
      }
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
        date: new Date().toISOString().split('T')[0]
      }
    };
  }
}