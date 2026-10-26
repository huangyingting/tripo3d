import { prisma } from '@/lib/prisma';
import { writeAuditLog } from '@/lib/audit';
import { AccountAdmissionError } from './errors';
import { hashPassword } from './passwords';
import { isValidAccountEmail, normalizeAccountEmail } from './policy';

/**
 * Provisions or promotes a root Administrator account from the deployment host CLI
 * (`npm run bootstrap:admin -- --email <email> --password <password>`).
 *
 * Security invariant: No demo accounts are ever created automatically.
 */
export async function bootstrapAdmin(input: {
  email: string;
  password: string;
  name?: string | null;
}) {
  const email = normalizeAccountEmail(input.email);
  if (!isValidAccountEmail(input.email)) {
    throw new AccountAdmissionError(
      400,
      'invalid_email',
      'Enter a valid administrator email address.'
    );
  }

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const displayName =
    input.name?.trim() || email.split('@')[0] || 'Tripo Admin';

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
    });

    const user = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            name: displayName,
            role: 'Admin',
            status: 'ACTIVE',
            revokedAt: null,
            emailVerified: existing.emailVerified ?? now,
          },
        })
      : await tx.user.create({
          data: {
            email,
            name: displayName,
            role: 'Admin',
            status: 'ACTIVE',
            level: 5,
            plan: 'MAX',
            credits: 25000,
            smartMeshTrials: 10,
            partGenTrials: 10,
            texture8kTrials: 10,
            onboardingCompleted: true,
            onboardingCategory: 'Game Assets',
            onboardingSubCategory: 'Character',
            emailVerified: now,
          },
        });

    await tx.passwordCredential.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        passwordHash,
        passwordChangedAt: now,
      },
      update: {
        passwordHash,
        passwordChangedAt: now,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    });

    return {
      user,
      created: !existing,
    };
  });

  await writeAuditLog({
    actorUserId: result.user.id,
    actorEmail: result.user.email,
    action: result.created ? 'ADMIN_BOOTSTRAPPED' : 'ADMIN_PROMOTED',
    targetType: 'USER',
    targetId: result.user.id,
    details: { role: 'Admin', plan: result.user.plan },
  });

  return result;
}
