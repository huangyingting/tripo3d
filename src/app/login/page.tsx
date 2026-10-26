'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Viewport3D from '@/components/three/Viewport3D';
import { synthesizeProceduralMesh } from '@/lib/engine3d/generator';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showcaseMesh = React.useMemo(
    () =>
      synthesizeProceduralMesh({
        prompt: 'Armored Cyber Valkyrie character with glowing golden visor',
        topology: 'QUAD',
        isRigged: true,
      }).meshData,
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid email or password');
      } else {
        router.push('/workspace/generate');
      }
    } catch {
      setError('Network error while signing in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#070709] text-slate-100">
      {/* Left 50%: Interactive 3D Showcase ("Tripo Studio - Where 3D Dreams Begin") */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 bg-[#0d0f17] p-10">
        <div className="z-10 flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/15">
              <svg viewBox="0 0 40 40" className="h-5 w-5">
                <path
                  d="M7 9 H33 L20 33 Z"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path d="M20 9 L33 9 L26.5 21 Z" fill="#f5c518" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-white">
              TRIPO STUDIO
            </span>
          </Link>
        </div>

        <div className="absolute inset-0">
          <Viewport3D
            meshData={showcaseMesh}
            modelName="Tripo H3.1 + Smart Mesh P2.0"
            topology="QUAD"
            compact
            showControls={false}
          />
        </div>

        <div className="z-10 rounded-3xl border border-white/10 bg-[#11131b]/85 p-6 backdrop-blur-xl space-y-2">
          <div className="text-xs font-extrabold uppercase tracking-wider text-[#f5c518]">
            Tripo Studio 3.1 • Invite-Only Production Environment
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Where 3D Dreams Begin
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Zero pre-seeded demo accounts. Every creator account is admitted via single-use cryptographic invitation codes with RBAC and full security audit logging.
          </p>
        </div>
      </div>

      {/* Right 50%: Authentication Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#12141c] p-8 shadow-2xl space-y-6">
          <div className="space-y-2 text-center">
            <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-bold text-[#f5c518]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Authorized Studio Sign In</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">
              Welcome to Tripo Studio
            </h1>
            <p className="text-xs text-slate-400">
              Sign in with your admitted account credentials to access your 3D workspace and API keys.
            </p>
          </div>

          {error && (
            <div
              data-testid="login-error-banner"
              className="flex items-start gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs text-rose-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  data-testid="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@studio.io"
                  className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-white/15 bg-[#181a24] py-2.5 pl-10 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              data-testid="btn-login-submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black shadow-lg shadow-[#f5c518]/20 hover:bg-[#fde047] disabled:opacity-50 transition"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Tripo Studio'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="border-t border-white/10 pt-5 space-y-3 text-center">
            <div className="text-xs text-slate-400">
              Have a single-use invitation code?
            </div>
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <KeyRound className="h-3.5 w-3.5 text-[#f5c518]" />
              Redeem Invitation Code & Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
