import { NextRequest, NextResponse } from 'next/server';
import {
  AccountAdmissionError,
  authenticatePassword,
  setDatabaseSessionCookie,
} from '@/lib/account-admission';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await authenticatePassword({
      email: String(body.email || ''),
      password: String(body.password || ''),
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    if (!result) {
      return NextResponse.json(
        {
          ok: false,
          code: 'invalid_credentials',
          error: 'Invalid email or password.',
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        status: result.user.status,
        credits: result.user.credits,
        plan: result.user.plan,
        onboardingCompleted: result.user.onboardingCompleted,
      },
    });
    setDatabaseSessionCookie(response, result.session);
    return response;
  } catch (error) {
    if (error instanceof AccountAdmissionError) {
      return NextResponse.json(
        { ok: false, code: error.code, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { ok: false, code: 'internal_error', error: 'Authentication failed.' },
      { status: 500 }
    );
  }
}
