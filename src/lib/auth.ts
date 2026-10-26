import type { NextAuthOptions } from 'next-auth';
import type { Adapter } from 'next-auth/adapters';
import { PrismaAdapter } from '@auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { authenticatePassword } from './account-admission/credentials';
import {
  SESSION_COOKIE_OPTIONS,
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from './account-admission/session';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'database',
    maxAge: SESSION_MAX_AGE_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Tripo Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const result = await authenticatePassword({
          email: credentials.email,
          password: credentials.password,
        });
        return result?.user ?? null;
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        Object.assign(session.user, {
          id: user.id,
          role: (user as { role?: string }).role ?? 'Creator',
          status: (user as { status?: string }).status ?? 'ACTIVE',
          credits: (user as { credits?: number }).credits ?? 200,
          plan: (user as { plan?: string }).plan ?? 'FREE',
        });
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: SESSION_COOKIE_OPTIONS.secure,
};
