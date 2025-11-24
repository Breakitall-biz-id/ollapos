import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      message: "Test successful",
      success: true,
      data: {
        test: "hello world",
        number: 123
      }
    });
  } catch (error) {
    return NextResponse.json({
      message: "Test failed",
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}