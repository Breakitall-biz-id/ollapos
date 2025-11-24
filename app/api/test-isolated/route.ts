import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transaction, transactionItem } from '@/db/schema/pos';
import { eq, and, gte, lt, inArray } from 'drizzle-orm';

export async function GET() {
  try {
    console.log('=== ISOLATED TEST ===');

    // Test pangkalan ID
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('Testing step by step...');
    console.log('1. Today:', today.toISOString());
    console.log('2. Tomorrow:', tomorrow.toISOString());

    // Step 1: Get today's transactions (working pattern from debug API)
    console.log('3. Getting today transactions...');
    const todayTransactions = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, hardcodedPangkalanId),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, today),
        lt(transaction.createdAt, tomorrow)
      ));

    console.log('4. Today transactions found:', todayTransactions.length);

    // Step 2: Calculate totals (no Object.entries involved)
    console.log('5. Calculating totals...');
    const totalSales = todayTransactions.reduce((sum, tx) => {
      const amount = Number(tx.totalAmount || 0);
      console.log('  - Adding amount:', amount, 'from transaction:', tx.id);
      return sum + amount;
    }, 0);

    const transactionCount = todayTransactions.length;
    console.log('6. Raw totals:', { totalSales, transactionCount });

    // Step 3: Get transaction items (this might be the issue)
    console.log('7. Getting transaction items...');
    let totalItems = 0;

    if (todayTransactions.length > 0) {
      const txIds = todayTransactions.map(tx => tx.id);
      console.log('8. Transaction IDs:', txIds);

      const itemsAgg = await db
        .select()
        .from(transactionItem)
        .where(inArray(transactionItem.transactionId, txIds));

      console.log('9. Raw items found:', itemsAgg.length);

      totalItems = itemsAgg.reduce((sum, item) => {
        const qty = item.qty || 0;
        console.log('  - Adding qty:', qty, 'from item:', item.id);
        return sum + qty;
      }, 0);

      console.log('10. Total items calculated:', totalItems);
    }

    // Step 4: Return result
    const result = {
      success: true,
      data: {
        totalSales,
        totalItems,
        transactionCount,
        date: today.toISOString().split('T')[0]
      }
    };

    console.log('11. Final result:', result);

    return NextResponse.json({
      message: "Isolated test completed",
      result
    });

  } catch (error) {
    console.error('Error in isolated test:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : 'No message');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }, { status: 500 });
  }
}