import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import { isValidAccountEmail, normalizeAccountEmail } from './policy';
import { createDatabaseSession } from './session';
import { hashOpaqueToken, normalizeInviteCode } from './tokens';

export type InvitationRegistrationInput = {
  email: string;
  password: string;
  name?: string | null;
  inviteCode: string;
  ipAddress?: string | null;
};

export async function registerWithInvitation(input: InvitationRegistrationInput) {
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Please enter a valid email address.'
    );
  }

  if (!input.inviteCode || !input.inviteCode.trim()) {
    throw new AccountAdmissionError(
      400,
      'invite_required',
      'An invitation code is required to register on Tripo Studio.'
    );
  }

  const normalizedEmail = normalizeAccountEmail(input.email);
  const code = normalizeInviteCode(input.inviteCode);
  const tokenHash = hashOpaqueToken(code);
  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const displayName =
    input.name?.trim().slice(0, 80) ||
    normalizedEmail.split('@')[0] ||
    'Tripo Creator';

  const invitation = await prisma.invitation.findFirst({
    where: {
      OR: [{ code }, { tokenHash }],
    },
  });

  if (!invitation) {
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: 'REGISTER_FAILED_INVALID_INVITE',
      targetType: 'INVITATION',
      ipAddress: input.ipAddress,
      details: { attemptedCode: code },
    });
    throw new AccountAdmissionError(
      410,
      'invalid_invitation',
      'This invitation code is invalid or does not exist.'
    );
  }

  if (invitation.status === 'REVOKED' || invitation.revokedAt) {
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: 'REGISTER_FAILED_REVOKED_INVITE',
      targetType: 'INVITATION',
      targetId: invitation.id,
      ipAddress: input.ipAddress,
      details: { code: invitation.code },
    });
    throw new AccountAdmissionError(
      410,
      'revoked_invitation',
      'This invitation code has been revoked.'
    );
  }

  if (invitation.status === 'CONSUMED' || invitation.usedCount >= invitation.maxUses) {
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: 'REGISTER_FAILED_CONSUMED_INVITE',
      targetType: 'INVITATION',
      targetId: invitation.id,
      ipAddress: input.ipAddress,
      details: { code: invitation.code },
    });
    throw new AccountAdmissionError(
      410,
      'consumed_invitation',
      'This single-use invitation code has already been consumed.'
    );
  }

  if (invitation.status === 'EXPIRED' || invitation.expiresAt <= now) {
    await prisma.invitation.updateMany({
      where: { id: invitation.id, status: 'ACTIVE' },
      data: { status: 'EXPIRED' },
    });
    await writeAuditLog({
      actorEmail: normalizedEmail,
      action: 'REGISTER_FAILED_EXPIRED_INVITE',
      targetType: 'INVITATION',
      targetId: invitation.id,
      ipAddress: input.ipAddress,
      details: { code: invitation.code },
    });
    throw new AccountAdmissionError(
      410,
      'expired_invitation',
      'This invitation code has expired.'
    );
  }

  if (invitation.emailHint && invitation.emailHint !== normalizedEmail) {
    throw new AccountAdmissionError(
      403,
      'email_mismatch',
      'This invitation code is restricted to a different email address.'
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new AccountAdmissionError(
      409,
      'already_member',
      'An account already exists for this email address.'
    );
  }

  const user = await prisma.$transaction(async (tx) => {
    const nextUsedCount = invitation.usedCount + 1;
    const nextStatus = nextUsedCount >= invitation.maxUses ? 'CONSUMED' : 'ACTIVE';

    const claimed = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        status: 'ACTIVE',
        usedCount: invitation.usedCount,
        expiresAt: { gt: now },
      },
      data: {
        usedCount: nextUsedCount,
        status: nextStatus,
        consumedAt: nextStatus === 'CONSUMED' ? now : invitation.consumedAt,
      },
    });

    if (!claimed.count) {
      throw new AccountAdmissionError(
        410,
        'invalid_invitation',
        'This invitation code was just consumed or is no longer active.'
      );
    }

    const created = await tx.user.create({
      data: {
        email: normalizedEmail,
        emailVerified: now,
        name: displayName,
        role: invitation.role || 'Creator',
        status: 'ACTIVE',
        level: 0,
        plan: 'FREE',
        credits: 200,
        smartMeshTrials: 2,
        partGenTrials: 1,
        texture8kTrials: 1,
        onboardingCompleted: false,
        passwordCredential: {
          create: {
            passwordHash,
            passwordChangedAt: now,
          },
        },
      },
    });

    await tx.invitation.update({
      where: { id: invitation.id },
      data: { consumedByUserId: created.id },
    });

    await tx.creditTransaction.create({
      data: {
        userId: created.id,
        delta: 200,
        balanceAfter: 200,
        reason: 'INITIAL_WELCOME_CREDITS',
        metadataJson: JSON.stringify({
          inviteCode: invitation.code,
          smartMeshTrials: 2,
          partGenTrials: 1,
          texture8kTrials: 1,
        }),
      },
    });

    return created;
  });

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'INVITE_CONSUMED',
    targetType: 'INVITATION',
    targetId: invitation.id,
    ipAddress: input.ipAddress,
    details: {
      code: invitation.code,
      assignedRole: user.role,
      initialCredits: 200,
    },
  });

  await writeAuditLog({
    actorUserId: user.id,
    actorEmail: user.email,
    action: 'USER_REGISTERED',
    targetType: 'USER',
    targetId: user.id,
    ipAddress: input.ipAddress,
    details: {
      role: user.role,
      inviteId: invitation.id,
    },
  });

  const session = await createDatabaseSession(user.id, now);
  return { user, session };
}
