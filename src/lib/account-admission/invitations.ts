import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError } from './errors';
import {
  type AdmissionRole,
  isValidAccountEmail,
  normalizeAccountEmail,
  normalizeRole,
} from './policy';
import {
  createInviteCode,
  hashOpaqueToken,
  normalizeInviteCode,
} from './tokens';

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type CreateInvitationInput = {
  emailHint?: string | null;
  role?: AdmissionRole | string;
  maxUses?: number;
  expiresInDays?: number;
  expiresAt?: Date;
  note?: string | null;
  createdByUserId?: string | null;
  createdByEmail?: string | null;
  customCode?: string | null;
};

export async function expireStaleInvitations(now = new Date()): Promise<number> {
  const result = await prisma.invitation.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });
  return result.count;
}

export async function createInvitation(input: CreateInvitationInput) {
  const now = new Date();
  await expireStaleInvitations(now);

  let emailHint: string | null = null;
  if (input.emailHint && input.emailHint.trim()) {
    if (!isValidAccountEmail(input.emailHint)) {
      throw new AccountAdmissionError(400, 'invalid_email', 'Invalid email hint.');
    }
    emailHint = normalizeAccountEmail(input.emailHint);
  }

  const role = normalizeRole(input.role);
  const maxUses = Math.max(1, Math.min(100, Number(input.maxUses ?? 1)));
  const expiresAt =
    input.expiresAt ??
    new Date(
      now.getTime() +
        Math.max(1, Math.min(90, Number(input.expiresInDays ?? 7))) * 86_400_000
    );

  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= now) {
    throw new AccountAdmissionError(
      400,
      'invalid_expiry',
      'Invitation expiration date must be in the future.'
    );
  }

  const code = input.customCode
    ? normalizeInviteCode(input.customCode)
    : createInviteCode('TRIPO');
  const tokenHash = hashOpaqueToken(code);

  const invitation = await prisma.invitation.create({
    data: {
      code,
      tokenHash,
      emailHint,
      role,
      status: 'ACTIVE',
      maxUses,
      usedCount: 0,
      note: input.note?.trim() || null,
      expiresAt,
      createdByUserId: input.createdByUserId ?? null,
    },
  });

  await writeAuditLog({
    actorUserId: input.createdByUserId ?? null,
    actorEmail: input.createdByEmail ?? 'system',
    action: 'INVITE_CREATED',
    targetType: 'INVITATION',
    targetId: invitation.id,
    details: {
      code: invitation.code,
      role: invitation.role,
      maxUses: invitation.maxUses,
      emailHint: invitation.emailHint,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  return {
    invitation,
    code,
  };
}

export async function inspectInvitation(rawCode: string, now = new Date()) {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, status: 'INVALID', reason: 'Invitation code is required.' };
  }
  const code = normalizeInviteCode(rawCode);
  const tokenHash = hashOpaqueToken(code);

  const invitation = await prisma.invitation.findFirst({
    where: {
      OR: [{ code }, { tokenHash }],
    },
  });

  if (!invitation) {
    return { valid: false, status: 'INVALID', reason: 'Invitation code not found.' };
  }

  if (invitation.status === 'REVOKED' || invitation.revokedAt) {
    return {
      valid: false,
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      status: 'REVOKED',
      reason: 'This invitation code has been revoked by an administrator.',
    };
  }

  if (invitation.status === 'CONSUMED' || invitation.usedCount >= invitation.maxUses) {
    return {
      valid: false,
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      status: 'CONSUMED',
      reason: 'This single-use invitation code has already been used.',
    };
  }

  if (invitation.status === 'EXPIRED' || invitation.expiresAt <= now) {
    if (invitation.status === 'ACTIVE') {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
    }
    return {
      valid: false,
      id: invitation.id,
      code: invitation.code,
      role: invitation.role,
      status: 'EXPIRED',
      reason: 'This invitation code has expired.',
    };
  }

  return {
    valid: true,
    id: invitation.id,
    code: invitation.code,
    role: invitation.role,
    emailHint: invitation.emailHint,
    maxUses: invitation.maxUses,
    usedCount: invitation.usedCount,
    remainingUses: invitation.maxUses - invitation.usedCount,
    expiresAt: invitation.expiresAt,
    status: 'ACTIVE',
  };
}

export async function revokeInvitation(
  idOrInput:
    | string
    | {
        invitationId: string;
        revokedByUserId?: string | null;
        revokedByEmail?: string | null;
      },
  actor?: { userId?: string | null; email?: string | null }
) {
  const id = typeof idOrInput === 'string' ? idOrInput : idOrInput.invitationId;
  const resolvedActor =
    typeof idOrInput === 'string'
      ? actor
      : {
          userId: idOrInput.revokedByUserId,
          email: idOrInput.revokedByEmail,
        };
  const invitation = await prisma.invitation.findUnique({ where: { id } });
  if (!invitation) {
    throw new AccountAdmissionError(404, 'not_found', 'Invitation not found.');
  }
  if (invitation.status === 'REVOKED') {
    return invitation;
  }

  const updated = await prisma.invitation.update({
    where: { id },
    data: {
      status: 'REVOKED',
      revokedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorUserId: resolvedActor?.userId ?? null,
    actorEmail: resolvedActor?.email ?? 'admin',
    action: 'INVITE_REVOKED',
    targetType: 'INVITATION',
    targetId: updated.id,
    details: { code: updated.code, previousStatus: invitation.status },
  });

  return updated;
}

export async function listInvitations() {
  await expireStaleInvitations();
  return prisma.invitation.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      consumedBy: { select: { id: true, name: true, email: true } },
    },
  });
}
