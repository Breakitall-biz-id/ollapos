import { NextResponse } from 'next/server';
import { getSalesSummary } from '@/lib/actions/transactions';

export async function GET() {
  try {
    console.log('=== TESTING GET SALES SUMMARY ===');

    const result = await getSalesSummary();

    console.log('Raw result from getSalesSummary():', {
      type: typeof result,
      success: result?.success,
      dataType: typeof result?.data,
      dataKeys: result?.data ? Object.keys(result.data) : 'no data',
      data: result?.data
    });

    return NextResponse.json({
      message: "Sales summary test",
      result
    });

  } catch (error) {
    console.error('Error in test-summary:', error);
    return NextResponse.json({
      message: "Test failed",
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}