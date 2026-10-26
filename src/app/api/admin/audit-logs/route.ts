import { NextRequest, NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/audit';
import { AccountAdmissionError, requireAdmin } from '@/lib/account-admission';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const action = req.nextUrl.searchParams.get('action') || undefined;
    const targetType = req.nextUrl.searchParams.get('targetType') || undefined;
    const limit = Number(req.nextUrl.searchParams.get('limit') || 150);

    const rawLogs = await listAuditLogs({ action, targetType, limit });
    const logs = rawLogs.map((l: any) => ({
      ...l,
      entityType: l.targetType,
      entityId: l.targetId,
      detailsJson: l.detailsJson || JSON.stringify(l.details || {}),
    }));
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json({ ok: false, error: 'Failed to load audit logs.' }, { status: 500 });
  }
}
