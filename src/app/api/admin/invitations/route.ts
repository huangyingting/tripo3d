import { NextRequest, NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  type AdmissionRole,
  createInvitation,
  listInvitations,
  requireAdmin,
  revokeInvitation,
} from '@/lib/account-admission';

function normalizeRole(input: unknown): AdmissionRole {
  const s = String(input || 'Creator').toUpperCase();
  if (s === 'ADMIN') return 'Admin';
  if (s === 'VIEWER') return 'Viewer';
  return 'Creator';
}

export async function GET() {
  try {
    await requireAdmin();
    const rawInvitations = await listInvitations();
    const invitations = rawInvitations.map((inv: any) => ({
      ...inv,
      email: inv.emailHint,
    }));
    return NextResponse.json({ ok: true, invitations });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to list invitations.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const expiresInDays = body.expiresInHours
      ? Math.max(0.05, Number(body.expiresInHours) / 24)
      : Number(body.expiresInDays || 7);

    const { invitation, code } = await createInvitation({
      emailHint: body.email || body.emailHint || null,
      role: normalizeRole(body.role),
      maxUses: Number(body.maxUses || 1),
      expiresInDays,
      note: body.note || null,
      customCode: body.customCode || null,
      createdByUserId: admin.id,
      createdByEmail: admin.email,
    });

    return NextResponse.json(
      {
        ok: true,
        invitation: {
          ...invitation,
          email: invitation.emailHint,
        },
        code,
        rawCode: code,
        registerUrl: `/register?code=${encodeURIComponent(code)}`,
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
    return NextResponse.json({ ok: false, error: 'Failed to create invitation.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const invitationId = String(body.invitationId || body.id || '');
    const revoked = await revokeInvitation({
      invitationId,
      revokedByUserId: admin.id,
      revokedByEmail: admin.email,
    });
    return NextResponse.json({ ok: true, invitation: revoked });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to revoke invitation.' }, { status: 500 });
  }
}
