import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import {
  AccountAdmissionError,
  hashOpaqueToken,
  requireCreator,
  requireViewer,
} from '@/lib/account-admission';

export async function GET() {
  try {
    const user = await requireViewer();
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    const tasks = await prisma.apiTask.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    return NextResponse.json({
      ok: true,
      keys: keys.map((k) => ({ ...k, prefix: k.keyPrefix })),
      tasks,
      transactions,
      wallet: {
        credits: user.credits,
        plan: user.plan,
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to load API keys.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireCreator();
    const body = await req.json();
    const name = String(body.name || 'Production Key').trim().slice(0, 64);

    const rawSecret = `tsk_live_${randomBytes(18).toString('hex')}`;
    const keyPrefix = `${rawSecret.slice(0, 15)}...${rawSecret.slice(-4)}`;
    const keyHash = hashOpaqueToken(rawSecret);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name,
        keyPrefix,
        keyHash,
        status: 'ACTIVE',
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'API_KEY_CREATED',
      targetType: 'API_KEY',
      targetId: apiKey.id,
      details: { name, keyPrefix },
    });

    return NextResponse.json(
      {
        ok: true,
        apiKey: { ...apiKey, prefix: apiKey.keyPrefix },
        secretKey: rawSecret,
        rawKey: rawSecret,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to create API key.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireCreator();
    let id = req.nextUrl.searchParams.get('id') || '';
    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = String(body.keyId || body.id || '');
    }
    const existing = await prisma.apiKey.findUnique({ where: { id } });
    if (!existing || (existing.userId !== user.id && user.role !== 'Admin')) {
      return NextResponse.json({ ok: false, error: 'API key not found.' }, { status: 404 });
    }

    const revoked = await prisma.apiKey.update({
      where: { id },
      data: { status: 'REVOKED' },
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'API_KEY_REVOKED',
      targetType: 'API_KEY',
      targetId: revoked.id,
      details: { name: revoked.name, keyPrefix: revoked.keyPrefix },
    });

    return NextResponse.json({ ok: true, apiKey: revoked });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to revoke API key.' }, { status: 500 });
  }
}
