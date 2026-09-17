import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    configured: true,
    adminExists: true,
    setupDisabled: true,
    message: 'Admin setup is disabled.',
  });
}

export async function POST() {
  return NextResponse.json(
    { error: 'Admin setup is disabled. Please log in with existing administrator credentials.' },
    { status: 403 }
  );
}

