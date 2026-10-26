import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentViewer, hashOpaqueToken } from '@/lib/account-admission';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const rawKey = authHeader.slice(7).trim();
    const keyHash = hashOpaqueToken(rawKey);
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: { user: true },
    });
    if (!apiKey || apiKey.status !== 'ACTIVE' || apiKey.user.status === 'REVOKED') {
      return NextResponse.json(
        { code: 2001, message: 'Invalid or revoked API key.' },
        { status: 401 }
      );
    }
    return NextResponse.json({
      code: 0,
      data: {
        balance: apiKey.user.credits,
        plan: apiKey.user.plan,
        frozen: 0,
      },
    });
  }

  const viewer = await getCurrentViewer();
  if (!viewer) {
    return NextResponse.json(
      { code: 2001, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    code: 0,
    data: {
      balance: viewer.credits,
      plan: viewer.plan,
      frozen: 0,
    },
  });
}
