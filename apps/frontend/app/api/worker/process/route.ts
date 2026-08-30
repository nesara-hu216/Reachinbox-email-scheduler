import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://reachinbox-backend.onrender.com';
    const res = await fetch(`${backendUrl}/api/worker/process`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Worker proxy error' },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
