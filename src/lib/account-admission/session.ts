import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AccountAdmissionError } from './errors';

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

export const SESSION_COOKIES = [
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
] as const;

const IS_PRODUCTION = process.env.NEXTAUTH_URL
  ? new URL(process.env.NEXTAUTH_URL).protocol === 'https:'
  : process.env.NODE_ENV === 'production';

export const SESSION_COOKIE_NAME = IS_PRODUCTION
  ? SESSION_COOKIES[1]
  : SESSION_COOKIES[0];

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  secure: IS_PRODUCTION,
};

export async function createDatabaseSession(userId: string, now = new Date()) {
  const expires = new Date(now.getTime() + SESSION_MAX_AGE_SECONDS * 1000);
  return prisma.session.create({
    data: {
      sessionToken: randomBytes(32).toString('base64url'),
      userId,
      expires,
    },
  });
}

export function setDatabaseSessionCookie(
  response: NextResponse,
  session: { sessionToken: string; expires: Date }
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.sessionToken,
    expires: session.expires,
    ...SESSION_COOKIE_OPTIONS,
  });
}

export function clearDatabaseSessionCookie(response: NextResponse): void {
  for (const name of SESSION_COOKIES) {
    response.cookies.set({
      name,
      value: '',
      expires: new Date(0),
      ...SESSION_COOKIE_OPTIONS,
    });
  }
}

export async function getCurrentViewer() {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(SESSION_COOKIES[0])?.value ||
      cookieStore.get(SESSION_COOKIES[1])?.value;
    if (!token) return null;

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session) return null;
    if (session.expires <= new Date()) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      return null;
    }

    const user = session.user;
    if (!user || user.status === 'REVOKED' || user.revokedAt) {
      await prisma.session.deleteMany({ where: { userId: user?.id } });
      return null;
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireViewer() {
  const user = await getCurrentViewer();
  if (!user) {
    throw new AccountAdmissionError(401, 'unauthorized', 'Authentication required.');
  }
  return user;
}

export async function requireCreator() {
  const user = await requireViewer();
  if (user.role !== 'Creator' && user.role !== 'Admin') {
    throw new AccountAdmissionError(
      403,
      'forbidden_viewer_role',
      'Your Viewer role is read-only and cannot execute generation or mutation actions.'
    );
  }
  return user;
}

export async function requireAdmin() {
  const user = await requireViewer();
  if (user.role !== 'Admin') {
    throw new AccountAdmissionError(
      403,
      'forbidden_admin_only',
      'Administrator privileges are required for this action.'
    );
  }
  return user;
}
