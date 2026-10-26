import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  clearDatabaseSessionCookie,
  SESSION_COOKIES,
} from '@/lib/account-admission';

export async function POST() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(SESSION_COOKIES[0])?.value ||
    cookieStore.get(SESSION_COOKIES[1])?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { sessionToken: token } });
  }

  const response = NextResponse.json({ ok: true });
  clearDatabaseSessionCookie(response);
  return response;
}
