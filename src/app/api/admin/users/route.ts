import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  AccountAdmissionError,
  type AdmissionRole,
  requireAdmin,
  updateUserGovernance,
} from '@/lib/account-admission';

function normalizeRole(input: unknown): AdmissionRole | undefined {
  if (!input) return undefined;
  const s = String(input).toUpperCase();
  if (s === 'ADMIN') return 'Admin';
  if (s === 'VIEWER') return 'Viewer';
  if (s === 'CREATOR') return 'Creator';
  return undefined;
}

export async function GET() {
  try {
    await requireAdmin();
    const rawUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        credits: true,
        level: true,
        smartMeshTrials: true,
        partGenTrials: true,
        texture8kTrials: true,
        onboardingCompleted: true,
        onboardingCategory: true,
        revokedAt: true,
        createdAt: true,
        _count: {
          select: {
            assets3d: true,
            apiKeys: true,
          },
        },
      },
    });
    const users = rawUsers.map((u) => ({
      ...u,
      creditsBalance: u.credits,
      planTier: u.plan,
    }));
    return NextResponse.json({ ok: true, users });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to list users.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const targetUserId = String(body.targetUserId || body.userId || '');
    const status =
      body.action === 'revoke'
        ? 'REVOKED'
        : body.action === 'restore'
          ? 'ACTIVE'
          : body.status === 'REVOKED' || body.status === 'ACTIVE'
            ? body.status
            : undefined;
    const creditsDelta =
      typeof body.creditsDelta === 'number'
        ? body.creditsDelta
        : typeof body.addCredits === 'number'
          ? body.addCredits
          : undefined;

    const updated = await updateUserGovernance({
      targetUserId,
      role: normalizeRole(body.role),
      status,
      creditsDelta,
      actorUserId: admin.id,
      actorEmail: admin.email,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        credits: updated.credits,
        creditsBalance: updated.credits,
        revokedAt: updated.revokedAt,
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to update user.' }, { status: 500 });
  }
}
