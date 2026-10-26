import { NextRequest, NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  requireAdmin,
  revokeInvitation,
} from '@/lib/account-admission';

export async function PATCH(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const invitation = await revokeInvitation(id, {
      userId: admin.id,
      email: admin.email,
    });
    return NextResponse.json({ ok: true, invitation });
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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}
