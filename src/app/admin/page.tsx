'use client';

import React, { useEffect, useState } from 'react';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import {
  Shield,
  KeyRound,
  Users,
  FileText,
  Plus,
  Copy,
  Check,
  Ban,
  RotateCcw,
  Zap,
  AlertCircle,
} from 'lucide-react';

export default function AdminGovernancePage() {
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [activeTab, setActiveTab] = useState<'invitations' | 'users' | 'audit'>(
    'invitations'
  );
  const [invitations, setInvitations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create Invite State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'CREATOR' | 'VIEWER' | 'ADMIN'>('CREATOR');
  const [expiresHours, setExpiresHours] = useState(72);
  const [inviteNote, setInviteNote] = useState('');
  const [issuedCode, setIssuedCode] = useState<{
    rawCode: string;
    registerUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadAdminData = async () => {
    setError(null);
    try {
      const [invRes, usrRes, audRes] = await Promise.all([
        fetch('/api/admin/invitations'),
        fetch('/api/admin/users'),
        fetch('/api/admin/audit-logs?limit=100'),
      ]);
      if (!invRes.ok) {
        const err = await invRes.json();
        setError(err.error || 'Admin access required');
        return;
      }
      const [invData, usrData, audData] = await Promise.all([
        invRes.json(),
        usrRes.json(),
        audRes.json(),
      ]);
      setInvitations(invData.invitations || []);
      setUsers(usrData.users || []);
      setAuditLogs(audData.logs || []);
    } catch {
      setError('Failed to load Admin Governance telemetry');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/admin/invitations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: inviteEmail.trim() || undefined,
        role: inviteRole,
        expiresInHours: expiresHours,
        note: inviteNote.trim() || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to create invitation');
    } else {
      setIssuedCode({
        rawCode: data.rawCode,
        registerUrl: data.registerUrl,
      });
      setInviteEmail('');
      setInviteNote('');
      loadAdminData();
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    await fetch('/api/admin/invitations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationId: id }),
    });
    loadAdminData();
  };

  const handleUserAction = async (
    targetUserId: string,
    payload: Record<string, unknown>
  ) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId, ...payload }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'User action failed');
    } else {
      loadAdminData();
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5c518]/15 px-3 py-1 text-xs font-bold text-[#f5c518]">
              <Shield className="h-3.5 w-3.5" />
              <span>Enterprise Security & Account Admission Governance</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-white">
              Admin Governance Console
            </h1>
            <p className="text-xs text-slate-400">
              Manage single-use expiring invitation codes, RBAC roles (Admin / Creator / Viewer), account revocation, and immutable security audit logs.
            </p>
          </div>

          <div className="flex gap-2">
            {(
              [
                { id: 'invitations', label: 'Invitations', icon: KeyRound },
                { id: 'users', label: `Users (${users.length})`, icon: Users },
                { id: 'audit', label: `Audit Logs (${auditLogs.length})`, icon: FileText },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`admin-tab-${t.id}`}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                    activeTab === t.id
                      ? 'bg-[#f5c518] text-black'
                      : 'border border-white/10 bg-[#12141c] text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
            <AlertCircle className="h-4 w-4 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* TAB 1: SINGLE-USE INVITATION CODES */}
        {activeTab === 'invitations' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-5 rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-5">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-[#f5c518]" />
                <span>Issue Single-Use Invitation Code</span>
              </h2>

              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Assigned Role
                  </label>
                  <select
                    data-testid="invite-role-select"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3 py-2 text-xs text-white"
                  >
                    <option value="CREATOR">CREATOR (Full 3D Studio + API v3)</option>
                    <option value="VIEWER">VIEWER (Read-Only Inspection & Export)</option>
                    <option value="ADMIN">ADMIN (Full Governance & Invite Issuance)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Restrict to Email (Optional)
                  </label>
                  <input
                    type="email"
                    data-testid="invite-email-input"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Leave blank for any recipient or lock to user@domain.com"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Expiration Window (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={expiresHours}
                    onChange={(e) => setExpiresHours(Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Audit Note
                  </label>
                  <input
                    type="text"
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    placeholder="e.g. Character Artist Onboarding"
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3.5 py-2 text-xs text-white"
                  />
                </div>

                <button
                  type="submit"
                  data-testid="btn-issue-invitation"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
                >
                  <KeyRound className="h-4 w-4" />
                  Generate Single-Use Invite Code
                </button>
              </form>

              {issuedCode && (
                <div
                  data-testid="issued-invite-box"
                  className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2"
                >
                  <div className="text-xs font-bold text-emerald-300">
                    Single-Use Invitation Token Issued (Copy Now):
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-black/50 px-3 py-2 font-mono text-xs text-[#f5c518]">
                    <span data-testid="issued-raw-code">{issuedCode.rawCode}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(issuedCode.rawCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-white hover:text-[#f5c518]"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    Direct link: <code className="text-white">{issuedCode.registerUrl}</code>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-4">
              <h2 className="text-base font-extrabold text-white">
                Invitation Ledger ({invitations.length})
              </h2>
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {invitations.map((inv) => {
                  const status = inv.revokedAt
                    ? 'REVOKED'
                    : inv.usedAt
                    ? 'REDEEMED'
                    : new Date(inv.expiresAt) < new Date()
                    ? 'EXPIRED'
                    : 'ACTIVE';
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#171923] p-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white">
                            {inv.codePrefix}••••••••
                          </span>
                          <span className="rounded bg-[#f5c518]/20 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                            {inv.role}
                          </span>
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                              status === 'ACTIVE'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : status === 'REDEEMED'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {inv.email ? `Locked to: ${inv.email}` : 'Unrestricted email'} •
                          Expires: {new Date(inv.expiresAt).toLocaleString()}
                          {inv.usedByUser ? ` • Used by: ${inv.usedByUser.email}` : ''}
                        </div>
                      </div>

                      {status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20"
                        >
                          Revoke Code
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS, RBAC ROLES & IMMEDIATE REVOCATION */}
        {activeTab === 'users' && (
          <div className="rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white">
              Admitted Accounts & Access Control
            </h2>
            <div className="space-y-3">
              {users.map((u) => (
                <div
                  key={u.id}
                  data-testid={`admin-user-row-${u.email}`}
                  className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#171923] p-4 sm:flex-row sm:items-center sm:justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{u.email}</span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {u.status}
                      </span>
                      <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                        {u.creditsBalance} ⚡
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Name: {u.name || '—'} • Plan: {u.planTier} • Assets:{' '}
                      {u._count?.assets || 0} • Active Sessions: {u._count?.sessions || 0}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      data-testid={`role-select-${u.email}`}
                      value={u.role}
                      onChange={(e) =>
                        handleUserAction(u.id, { role: e.target.value })
                      }
                      className="rounded-lg border border-white/15 bg-[#0e1017] px-2.5 py-1.5 text-xs font-bold text-white"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="CREATOR">CREATOR</option>
                      <option value="VIEWER">VIEWER</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleUserAction(u.id, { addCredits: 500 })}
                      className="flex items-center gap-1 rounded-lg border border-[#f5c518]/40 bg-[#f5c518]/10 px-2.5 py-1.5 text-[11px] font-bold text-[#f5c518] hover:bg-[#f5c518] hover:text-black transition"
                    >
                      <Zap className="h-3 w-3" /> +500 ⚡
                    </button>

                    {u.status === 'ACTIVE' ? (
                      <button
                        type="button"
                        data-testid={`btn-revoke-${u.email}`}
                        onClick={() =>
                          handleUserAction(u.id, {
                            action: 'revoke',
                            reason: 'Revoked by Administrator',
                          })
                        }
                        className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30"
                      >
                        <Ban className="h-3.5 w-3.5" /> Revoke Access
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`btn-restore-${u.email}`}
                        onClick={() => handleUserAction(u.id, { action: 'restore' })}
                        className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Restore
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: IMMUTABLE SECURITY AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-4">
            <h2 className="text-base font-extrabold text-white">
              Immutable Security & Governance Audit Trail
            </h2>
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col justify-between gap-2 rounded-xl border border-white/10 bg-[#171923] px-4 py-3 text-xs sm:flex-row sm:items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#f5c518]/20 px-2 py-0.5 font-mono text-[10px] font-bold text-[#f5c518]">
                        {log.action}
                      </span>
                      <span className="font-semibold text-white">
                        {log.targetType} {log.targetId ? `(${log.targetId})` : ''}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Actor: {log.actorUser?.email || 'System / Anonymous'} • IP:{' '}
                      {log.ipAddress || 'local'}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
