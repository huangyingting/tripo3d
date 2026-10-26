import { NextRequest, NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  registerWithInvitation,
  setDatabaseSessionCookie,
} from '@/lib/account-admission';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user, session } = await registerWithInvitation({
      email: String(body.email || ''),
      password: String(body.password || ''),
      name: body.name ? String(body.name) : null,
      inviteCode: String(
        body.invitationCode || body.inviteCode || body.token || body.code || ''
      ),
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const response = NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role.toUpperCase(),
          status: user.status,
          credits: user.credits,
          creditsBalance: user.credits,
          plan: user.plan,
          planTier: user.plan,
          onboardingCompleted: user.onboardingCompleted,
        },
      },
      { status: 201 }
    );
    setDatabaseSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: 'internal_error', error: 'Registration failed.' },
      { status: 500 }
    );
  }
}
