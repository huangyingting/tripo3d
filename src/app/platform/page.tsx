'use client';

import React, { useEffect, useState } from 'react';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import {
  Key,
  Terminal,
  Plus,
  Trash2,
  Play,
  Copy,
  Check,
  Zap,
  Code2,
  ShieldAlert,
} from 'lucide-react';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function DeveloperPlatformPage() {
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('Production Game Pipeline');
  const [rawCreatedKey, setRawCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // OpenAPI v3 Playground State
  const [taskType, setTaskType] = useState<
    | 'text_to_model'
    | 'image_to_model'
    | 'mesh_segmentation'
    | 'refine_model'
    | 'animate_rig'
  >('text_to_model');
  const [taskPrompt, setTaskPrompt] = useState(
    'Armored Cyber Valkyrie character with glowing golden visor'
  );
  const [modelVersion, setModelVersion] = useState('v3.1-20260211');
  const [playgroundResponse, setPlaygroundResponse] = useState<string>('');
  const [runningTask, setRunningTask] = useState(false);

  const loadKeys = async () => {
    const res = await fetch('/api/platform/keys');
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys || []);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [user]);

  const handleCreateKey = async () => {
    const res = await fetch('/api/platform/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName }),
    });
    const data = await res.json();
    if (res.ok && data.rawKey) {
      setRawCreatedKey(data.rawKey);
      loadKeys();
    } else {
      setPlaygroundResponse(JSON.stringify(data, null, 2));
    }
  };

  const handleRevokeKey = async (id: string) => {
    await fetch(`/api/platform/keys?id=${id}`, { method: 'DELETE' });
    loadKeys();
  };

  const handleExecuteV3Task = async () => {
    setRunningTask(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (rawCreatedKey) {
        headers['Authorization'] = `Bearer ${rawCreatedKey}`;
      }
      const res = await fetch('/api/v3/tasks', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: taskType,
          prompt: taskPrompt,
          model_version: modelVersion,
          quad: taskType === 'refine_model',
          pbr: true,
        }),
      });
      const data = await res.json();
      setPlaygroundResponse(JSON.stringify(data, null, 2));
    } finally {
      setRunningTask(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        {/* Platform Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5c518]/15 px-3 py-1 text-xs font-bold text-[#f5c518]">
              <Terminal className="h-3.5 w-3.5" />
              <span>platform.tripo3d.ai • OpenAPI v3.0 Console</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold text-white">
              Tripo Developer API Platform
            </h1>
            <p className="text-xs text-slate-400">
              Generate <code className="text-[#f5c518]">tsk_...</code> bearer keys and invoke <code className="text-sky-400">POST /api/v3/tasks</code> for programmatic 3D synthesis.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#12141c] px-5 py-3">
            <Zap className="h-5 w-5 text-[#f5c518]" />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                API Wallet Balance
              </div>
              <div className="text-lg font-extrabold text-white">
                {user ? user.creditsBalance.toLocaleString() : '200'} ⚡
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: API Key Management (tsk_...) */}
          <div className="lg:col-span-6 space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Key className="h-4 w-4 text-[#f5c518]" />
                  <span>API Secret Keys (tsk_...)</span>
                </h2>
              </div>

              {!user && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-[#f5c518]" />
                  <span>
                    Sign in with a Creator or Admin account to issue persistent{' '}
                    <code>tsk_...</code> API keys.
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  data-testid="api-key-name-input"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key label (e.g. Unreal Build Server)"
                  className="flex-1 rounded-xl border border-white/15 bg-[#181a24] px-3.5 py-2 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                />
                <button
                  type="button"
                  data-testid="btn-create-api-key"
                  onClick={handleCreateKey}
                  className="flex items-center gap-1.5 rounded-xl bg-[#f5c518] px-4 py-2 text-xs font-extrabold text-black hover:bg-[#fde047]"
                >
                  <Plus className="h-4 w-4" /> Create Key
                </button>
              </div>

              {rawCreatedKey && (
                <div
                  data-testid="created-raw-api-key"
                  className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 space-y-2"
                >
                  <div className="text-xs font-bold text-emerald-300">
                    Copy your secret API key now — it is hashed with SHA-256 and shown only once:
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-black/50 px-3 py-2 font-mono text-xs text-white">
                    <span className="truncate">{rawCreatedKey}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(rawCreatedKey);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-[#f5c518] hover:text-white"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Keys Table */}
              <div className="space-y-2">
                {keys.map((k) => (
                  <div
                    key={k.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#171923] px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{k.name}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {k.keyPrefix}••••••••••••
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {k.revokedAt ? (
                        <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                          REVOKED
                        </span>
                      ) : (
                        <>
                          <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                            ACTIVE
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRevokeKey(k.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-400"
                            title="Revoke API Key"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* cURL Code Snippet */}
            <div className="rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Code2 className="h-4 w-4 text-sky-400" />
                <span>OpenAPI v3 Quickstart (cURL)</span>
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-[#090a0e] p-4 font-mono text-[11px] text-slate-300 leading-relaxed">
{`curl -X POST http://localhost:3000/api/v3/tasks \\
  -H "Authorization: Bearer ${rawCreatedKey || 'tsk_your_secret_key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "${taskType}",
    "prompt": "${taskPrompt}",
    "model_version": "${modelVersion}",
    "pbr": true
  }'`}
              </pre>
            </div>
          </div>

          {/* Right Column: Live OpenAPI v3 Task Playground */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-white/10 bg-[#11131b] p-6 space-y-4">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#f5c518]" />
                <span>Interactive OpenAPI v3 Task Runner</span>
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Task Type
                  </label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3 py-2 text-xs text-white"
                  >
                    <option value="text_to_model">text_to_model</option>
                    <option value="image_to_model">image_to_model</option>
                    <option value="mesh_segmentation">mesh_segmentation</option>
                    <option value="refine_model">refine_model (Smart Mesh P2.0)</option>
                    <option value="animate_rig">animate_rig</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Model Version
                  </label>
                  <select
                    value={modelVersion}
                    onChange={(e) => setModelVersion(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3 py-2 text-xs text-white"
                  >
                    <option value="v3.1-20260211">v3.1-20260211 (H3.1 Ultra)</option>
                    <option value="P2.0-20260301">P2.0-20260301 (Smart Mesh)</option>
                    <option value="v3.0-20250801">v3.0-20250801 (Fast)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Prompt</label>
                <input
                  type="text"
                  value={taskPrompt}
                  onChange={(e) => setTaskPrompt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-[#181a24] px-3.5 py-2 text-xs text-white"
                />
              </div>

              <button
                type="button"
                data-testid="btn-run-v3-task"
                disabled={runningTask}
                onClick={handleExecuteV3Task}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                {runningTask ? 'Executing POST /api/v3/tasks...' : 'Send POST /api/v3/tasks'}
              </button>

              <div>
                <div className="mb-1.5 text-xs font-semibold text-slate-400">
                  JSON Response Payload
                </div>
                <pre
                  data-testid="v3-task-response"
                  className="h-64 overflow-auto rounded-2xl border border-white/10 bg-[#08090d] p-4 font-mono text-[11px] text-emerald-300"
                >
                  {playgroundResponse ||
                    '// Click "Send POST /api/v3/tasks" to execute a real OpenAPI v3 3D generation task'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
