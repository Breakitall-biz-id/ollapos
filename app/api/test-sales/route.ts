import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transaction, transactionItem } from '@/db/schema/pos';
import { eq, and, desc, gte, lt, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    // Test pangkalan ID
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Testing sales data...');
    console.log('Pangkalan ID:', hardcodedPangkalanId);
    console.log('Today:', today.toISOString());
    console.log('Tomorrow:', tomorrow.toISOString());

    // Get all transactions (no date filter first)
    const allTransactions = await db
      .select({
        id: transaction.id,
        totalAmount: transaction.totalAmount,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        pangkalanId: transaction.pangkalanId
      })
      .from(transaction);

    console.log('All transactions found:', allTransactions.length);

    // Get today's transactions
    const todayTransactions = await db
      .select({
        id: transaction.id,
        totalAmount: transaction.totalAmount,
        status: transaction.status,
        paymentMethod: transaction.paymentMethod,
        createdAt: transaction.createdAt,
        pangkalanId: transaction.pangkalanId
      })
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, hardcodedPangkalanId),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, today),
        lt(transaction.createdAt, tomorrow)
      ));

    console.log('Today transactions found:', todayTransactions.length);

    // Get transaction items for today's transactions
    let totalItems = 0;
    if (todayTransactions.length > 0) {
      const txIds = todayTransactions.map(tx => tx.id);
      const items = await db
        .select({
          quantity: transactionItem.quantity,
          transactionId: transactionItem.transactionId
        })
        .from(transactionItem)
        .where(inArray(transactionItem.transactionId, txIds));

      totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      console.log('Transaction items found:', items.length);
      console.log('Total items calculated:', totalItems);
    }

    const totalSales = todayTransactions.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);

    const debugTransactions = todayTransactions.map(tx => ({
        id: tx.id,
        amount: tx.totalAmount,
        status: tx.status,
        createdAt: tx.createdAt
      }));

    return NextResponse.json({
      success: true,
      message: "Sales data retrieved successfully",
      summary: {
        allTransactions: allTransactions.length,
        todayTransactions: todayTransactions.length,
        totalSales,
        totalItems,
        transactionCount: todayTransactions.length
      },
      debug: {
        pangkalanId: hardcodedPangkalanId,
        today: today.toISOString(),
        tomorrow: tomorrow.toISOString(),
        transactions: debugTransactions
      }
    });

  } catch (error) {
    console.error('Error in test-sales:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }, { status: 500 });
  }
}