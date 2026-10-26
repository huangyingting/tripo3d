import { prisma } from './prisma';

export type AuditLogInput = {
  actorUserId?: string | null;
  actorEmail?: string | null;
  action: string;
  targetType: 'USER' | 'INVITATION' | 'ASSET_3D' | 'PRE3D_IMAGE' | 'API_KEY' | 'API_TASK' | 'SUBSCRIPTION' | 'SYSTEM';
  targetId?: string | null;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
};

export async function writeAuditLog(input: AuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      ipAddress: input.ipAddress ?? null,
      detailsJson: JSON.stringify(input.details ?? {}),
    },
  });
}

export async function listAuditLogs(options?: {
  action?: string;
  targetType?: string;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (options?.action && options.action !== 'ALL') {
    where.action = options.action;
  }
  if (options?.targetType && options.targetType !== 'ALL') {
    where.targetType = options.targetType;
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(options?.limit ?? 100, 500),
    include: {
      actor: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  });

  return rows.map((row) => {
    let details: Record<string, unknown> = {};
    try {
      details = JSON.parse(row.detailsJson || '{}');
    } catch {
      details = {};
    }
    return {
      ...row,
      details,
    };
  });
}
