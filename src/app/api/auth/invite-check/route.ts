import { NextRequest, NextResponse } from 'next/server';
import { inspectInvitation } from '@/lib/account-admission';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '';
  const result = await inspectInvitation(code);
  return NextResponse.json(result, { status: result.valid ? 200 : 400 });
}
