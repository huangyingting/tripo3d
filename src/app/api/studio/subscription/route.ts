import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError, requireCreator } from '@/lib/account-admission';

const PLAN_CREDITS: Record<string, number> = {
  FREE: 200,
  PRO_3K: 3000,
  PRO_6K: 6000,
  PRO_12K: 12000,
  PRO: 3000,
  MAX: 25000,
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireCreator();
    const body = await req.json();

    if (body.redeemCode) {
      const code = String(body.redeemCode).trim().toUpperCase();
      const bonus = code.startsWith('TRIPO') ? 500 : 300;
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: bonus } },
      });
      await prisma.creditTransaction.create({
        data: {
          userId: user.id,
          delta: bonus,
          balanceAfter: updated.credits,
          reason: 'REDEEM_PROMO_CODE',
          metadataJson: JSON.stringify({ code }),
        },
      });
      await writeAuditLog({
        actorUserId: user.id,
        actorEmail: user.email,
        action: 'CREDITS_REDEEMED',
        targetType: 'SUBSCRIPTION',
        targetId: user.id,
        details: { code, bonus, balanceAfter: updated.credits },
      });
      return NextResponse.json({
        ok: true,
        plan: updated.plan,
        credits: updated.credits,
        bonus,
      });
    }

    const rawTier = String(body.plan || 'PRO').toUpperCase();
    const plan = rawTier.startsWith('PRO') ? 'PRO' : rawTier === 'MAX' ? 'MAX' : 'FREE';
    const creditGrant = PLAN_CREDITS[rawTier] ?? 3000;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan,
        credits: { increment: creditGrant },
        level: plan === 'MAX' ? Math.max(user.level, 3) : Math.max(user.level, 1),
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        delta: creditGrant,
        balanceAfter: updated.credits,
        reason: `SUBSCRIPTION_UPGRADE_${rawTier}`,
        metadataJson: JSON.stringify({ billingCycle: body.billingCycle || 'annual' }),
      },
    });

    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'PLAN_UPGRADED',
      targetType: 'SUBSCRIPTION',
      targetId: user.id,
      details: { plan, creditGrant, balanceAfter: updated.credits },
    });

    return NextResponse.json({
      ok: true,
      plan: updated.plan,
      credits: updated.credits,
      level: updated.level,
    });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'Subscription update failed.' },
      { status: 500 }
    );
  }
}
