import { NextResponse } from 'next/server';
import { db } from '@/db';
import { transaction } from '@/db/schema/pos';
import { eq, and, gte, lt } from 'drizzle-orm';

export async function GET() {
  try {
    // Test pangkalan ID
    const hardcodedPangkalanId = 'pangkalan-2kjqYYJAQ5I_q-6ti14Ta';

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    console.log('=== SALES DEBUG API ===');
    console.log('Pangkalan ID:', hardcodedPangkalanId);
    console.log('Today (UTC):', today.toISOString());
    console.log('Tomorrow (UTC):', tomorrow.toISOString());

    // Test query step by step
    console.log('\n1. Testing all transactions...');
    const allTx = await db.select().from(transaction);
    console.log('All transactions raw:', allTx.length);

    console.log('\n2. Testing today transactions...');
    const todayTx = await db
      .select()
      .from(transaction)
      .where(and(
        eq(transaction.pangkalanId, hardcodedPangkalanId),
        eq(transaction.status, 'paid'),
        gte(transaction.createdAt, today),
        lt(transaction.createdAt, tomorrow)
      ));
    console.log('Today transactions raw:', todayTx.length);

    if (todayTx.length > 0) {
      console.log('Sample transaction:', {
        id: todayTx[0].id,
        amount: todayTx[0].totalAmount,
        status: todayTx[0].status,
        createdAt: todayTx[0].createdAt?.toISOString()
      });
    }

    // Calculate summary
    const totalSales = todayTx.reduce((sum, tx) => sum + Number(tx.totalAmount || 0), 0);
    const transactionCount = todayTx.length;

    console.log('Final summary:', { totalSales, transactionCount });

    return NextResponse.json({
      success: true,
      data: {
        totalSales,
        totalItems: 0, // Will calculate later
        transactionCount,
        date: today.toISOString().split('T')[0]
      },
      debug: {
        allTransactionsCount: allTx.length,
        todayTransactionsCount: todayTx.length,
        sampleTransaction: todayTx[0] ? {
          id: todayTx[0].id,
          amount: todayTx[0].totalAmount,
          status: todayTx[0].status,
          createdAt: todayTx[0].createdAt?.toISOString()
        } : null
      }
    });

  } catch (error) {
    console.error('Error in sales-debug:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    }, { status: 500 });
  }
}