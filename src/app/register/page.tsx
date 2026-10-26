'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  KeyRound,
  Mail,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';

  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCheck, setInviteCheck] = useState<{
    valid: boolean;
    role?: string;
    restrictedEmail?: string | null;
    expiresAt?: string;
    reason?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!code || code.trim().length < 4) {
      setInviteCheck(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/auth/invitations/validate?code=${encodeURIComponent(code.trim())}`
        );
        const data = await res.json();
        setInviteCheck(data);
        if (data.valid && data.restrictedEmail && !email) {
          setEmail(data.restrictedEmail);
        }
      } catch {
        setInviteCheck(null);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [code]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationCode: code.trim(),
          email: email.trim(),
          name: name.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        router.push('/workspace/generate');
      }
    } catch {
      setError('Network error during registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141c] p-8 shadow-2xl space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-bold text-[#f5c518]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Invite-Only Account Admission</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          Redeem Studio Invitation
        </h1>
        <p className="text-xs text-slate-400">
          Enter your single-use cryptographic invitation code to activate your Tripo Studio account with 300 ⚡ starter credits.
        </p>
      </div>

      {error && (
        <div
          data-testid="register-error-banner"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-slate-300">
            Single-Use Invitation Code
          </label>
          <div className="relative mt-1.5">
            <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-[#f5c518]" />
            <input
              type="text"
              required
              data-testid="register-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="TRIPO-XXXX-XXXX-XXXX"
              className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 font-mono text-xs uppercase text-white focus:border-[#f5c518] focus:outline-none"
            />
          </div>

          {inviteCheck && (
            <div
              data-testid="invite-validation-badge"
              className={`mt-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] ${
                inviteCheck.valid
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
              }`}
            >
              {inviteCheck.valid ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>
                    Valid invitation • Grants role{' '}
                    <strong>{inviteCheck.role}</strong>
                  </span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>
                    Invalid or unavailable code ({inviteCheck.reason || 'NOT_FOUND'})
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300">
            Display Name
          </label>
          <div className="relative mt-1.5">
            <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              required
              data-testid="register-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Mercer"
              className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300">
            Email Address
          </label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="email"
              required
              data-testid="register-email-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="creator@studio.io"
              className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-300">
            Password (min 10 chars, upper, lower, number, symbol)
          </label>
          <div className="relative mt-1.5">
            <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="password"
              required
              data-testid="register-password-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          data-testid="btn-register-submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black shadow-lg shadow-[#f5c518]/20 hover:bg-[#fde047] disabled:opacity-50 transition"
        >
          <span>{loading ? 'Redeeming Invite...' : 'Redeem Invite & Create Account'}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="border-t border-white/10 pt-4 text-center text-xs text-slate-400">
        Already have an admitted account?{' '}
        <Link href="/login" className="font-bold text-[#f5c518] hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#070709] p-6 text-slate-100">
      <Suspense fallback={<div className="text-xs text-slate-400">Loading...</div>}>
        <RegisterFormContent />
      </Suspense>
    </div>
  );
}
