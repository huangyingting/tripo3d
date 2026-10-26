import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError } from './errors';
import { createDatabaseSession } from './session';
import { normalizeAccountEmail, normalizeRole } from './policy';
import { verifyPassword } from './passwords';

const DUMMY_PASSWORD_HASH =
  'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function authenticatePassword(input: {
  email: string;
  password: string;
  ipAddress?: string | null;
}) {
  const normalizedEmail = normalizeAccountEmail(input.email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { passwordCredential: true },
  });

  const valid = await verifyPassword(
    input.password,
    user?.passwordCredential?.passwordHash || DUMMY_PASSWORD_HASH
  );

  if (!valid || !user?.passwordCredential) {
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: 'USER_LOGIN_FAILED',
      targetType: 'USER',
      targetId: user?.id ?? null,
      ipAddress: input.ipAddress,
      details: { reason: 'invalid_credentials' },
    });
    return null;
  }

  if (user.status === 'REVOKED' || user.revokedAt) {
    await writeAuditLog({
      actorUserId: user.id,
      actorEmail: user.email,
      action: 'USER_LOGIN_BLOCKED_REVOKED',
      targetType: 'USER',
      targetId: user.id,
      ipAddress: input.ipAddress,
      details: { status: user.status },
    });
    throw new AccountAdmissionError(
      403,
      'account_revoked',
      'This account has been revoked by an administrator.'
    );
  }

  const session = await createDatabaseSession(user.id);

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'USER_LOGIN_SUCCESS',
    targetType: 'USER',
    targetId: user.id,
    ipAddress: input.ipAddress,
    details: { role: user.role },
  });

  return { user, session };
}

export async function updateUserGovernance(input: {
  targetUserId: string;
  role?: string;
  status?: 'ACTIVE' | 'REVOKED';
  creditsDelta?: number;
  actorUserId: string;
  actorEmail: string;
}) {
  const target = await prisma.user.findUnique({
    where: { id: input.targetUserId },
  });
  if (!target) {
    throw new AccountAdmissionError(404, 'user_not_found', 'User not found.');
  }

  const data: Record<string, unknown> = {};
  if (input.role) {
    data.role = normalizeRole(input.role);
  }
  if (input.status) {
    data.status = input.status;
    data.revokedAt = input.status === 'REVOKED' ? new Date() : null;
  }
  if (typeof input.creditsDelta === 'number' && input.creditsDelta !== 0) {
    data.credits = Math.max(0, target.credits + input.creditsDelta);
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data,
  });

  if (input.status === 'REVOKED') {
    await prisma.session.deleteMany({ where: { userId: target.id } });
  }

  if (typeof input.creditsDelta === 'number' && input.creditsDelta !== 0) {
    await prisma.creditTransaction.create({
      data: {
        userId: target.id,
        delta: input.creditsDelta,
        balanceAfter: updated.credits,
        reason: 'ADMIN_CREDIT_ADJUSTMENT',
        metadataJson: JSON.stringify({ actorEmail: input.actorEmail }),
      },
    });
  }

  await writeAuditLog({
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    action:
      input.status === 'REVOKED'
        ? 'USER_REVOKED'
        : input.status === 'ACTIVE' && target.status === 'REVOKED'
        ? 'USER_RESTORED'
        : 'USER_GOVERNANCE_UPDATED',
    targetType: 'USER',
    targetId: updated.id,
    details: {
      previousRole: target.role,
      newRole: updated.role,
      previousStatus: target.status,
      newStatus: updated.status,
      creditsDelta: input.creditsDelta ?? 0,
      newCredits: updated.credits,
    },
  });

  return updated;
}
