import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireViewer } from '@/lib/account-admission';

export async function POST(req: NextRequest) {
  try {
    const user = await requireViewer();
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.onboardingCompleted === 'boolean') {
      data.onboardingCompleted = body.onboardingCompleted;
    }
    if (
      body.category !== undefined ||
      body.primaryUseCase !== undefined ||
      body.onboardingCategory !== undefined
    ) {
      data.onboardingCategory = String(
        body.category ||
          body.primaryUseCase ||
          body.onboardingCategory ||
          'Game Assets'
      );
      data.onboardingCompleted = true;
    }
    if (
      body.subCategory !== undefined ||
      body.onboardingSubCategory !== undefined
    ) {
      data.onboardingSubCategory = String(
        body.subCategory || body.onboardingSubCategory || 'Character'
      );
    }
    if (body.planTier !== undefined || body.plan !== undefined) {
      const tier = String(body.planTier || body.plan || 'FREE').toUpperCase();
      data.plan = tier;
      if (tier === 'PRO') data.credits = { increment: 3000 };
      else if (tier === 'MAX') data.credits = { increment: 12000 };
    }
    if (body.dccConnections && typeof body.dccConnections === 'object') {
      data.dccConnectionsJson = JSON.stringify(body.dccConnections);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: body.planTier
        ? 'PLAN_UPGRADED'
        : body.dccConnections
        ? 'DCC_BRIDGE_UPDATED'
        : 'ONBOARDING_COMPLETED',
      targetType: 'USER',
      targetId: user.id,
      details: {
        category: updated.onboardingCategory,
        subCategory: updated.onboardingSubCategory,
        plan: updated.plan,
      },
    });

    return NextResponse.json({
      ok: true,
      onboardingCompleted: updated.onboardingCompleted,
      onboardingCategory: updated.onboardingCategory,
      onboardingSubCategory: updated.onboardingSubCategory,
      dccConnections: JSON.parse(updated.dccConnectionsJson || '{}'),
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role.toUpperCase(),
        status: updated.status,
        planTier: updated.plan,
        creditsBalance: updated.credits,
        smartMeshTrials: updated.smartMeshTrials,
        onboardingCompleted: updated.onboardingCompleted,
        primaryUseCase: updated.onboardingCategory,
        subCategory: updated.onboardingSubCategory,
      },
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Failed to update studio preferences.' },
      { status: 500 }
    );
  }
}
