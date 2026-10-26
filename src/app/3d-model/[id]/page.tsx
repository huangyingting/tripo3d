'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import Viewport3D from '@/components/three/Viewport3D';
import type { ProceduralMeshData } from '@/lib/engine3d/generator';
import {
  Download,
  Sparkles,
  Heart,
  Layers,
  Bone,
  Grid,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';

export default function ModelDetailPage() {
  const params = useParams<{ id: string }>();
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [asset, setAsset] = useState<any>(null);
  const [activeAnim, setActiveAnim] = useState<string | null>('Idle');

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/studio/assets/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.asset) setAsset(d.asset);
      });
  }, [params?.id]);

  const meshData: ProceduralMeshData | null = React.useMemo(() => {
    if (!asset?.geometryJson) return null;
    try {
      return JSON.parse(asset.geometryJson) as ProceduralMeshData;
    } catch {
      return null;
    }
  }, [asset]);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/studio"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Community Showcase
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Tripo 3D Asset • CC-BY 4.0
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Interactive 3D Viewport */}
          <div className="lg:col-span-8 h-[540px] overflow-hidden rounded-3xl border border-white/10 bg-[#101219] shadow-2xl">
            <Viewport3D
              meshData={meshData}
              modelName={asset?.name}
              topology={asset?.topology}
              vertices={asset?.vertices}
              faces={asset?.faces}
              isSegmented={asset?.isSegmented}
              isRigged={asset?.isRigged}
              activeAnimation={activeAnim}
            />
          </div>

          {/* Right Metadata & Export Card */}
          <div className="lg:col-span-4 flex flex-col justify-between rounded-3xl border border-white/10 bg-[#12141c] p-6 space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#f5c518]/20 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                    {asset?.aiModelVersion || 'H3.1'}
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {asset?.generationMode || 'HD_MODEL'}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-extrabold text-white">
                  {asset?.name || 'Loading 3D Asset...'}
                </h1>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#0b0d13] p-3.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Generation Prompt
                </div>
                <p className="mt-1 text-xs text-slate-200 leading-relaxed">
                  {asset?.prompt || 'Generated procedural 3D asset'}
                </p>
              </div>

              {/* Technical Telemetry */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-slate-400">Topology</div>
                  <div className="mt-0.5 font-bold text-white flex items-center gap-1">
                    <Grid className="h-3.5 w-3.5 text-[#f5c518]" />
                    {asset?.topology || 'TRIANGLE'}
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-slate-400">Polygon Budget</div>
                  <div className="mt-0.5 font-bold text-white">
                    {(asset?.faces || 18400).toLocaleString()} faces
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-slate-400">Semantic Parts</div>
                  <div className="mt-0.5 font-bold text-white flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-sky-400" />
                    {meshData?.parts?.length || 1} Sub-Meshes
                  </div>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-3">
                  <div className="text-[10px] text-slate-400">Skeleton Rig</div>
                  <div className="mt-0.5 font-bold text-white flex items-center gap-1">
                    <Bone className="h-3.5 w-3.5 text-emerald-400" />
                    {asset?.isRigged ? '16-Bone Biped' : 'Static Mesh'}
                  </div>
                </div>
              </div>

              {asset?.isRigged && (
                <div>
                  <div className="mb-1.5 text-xs font-semibold text-slate-300">
                    Preview Rig Motion Clips
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['Idle', 'Walk', 'Run', 'Jump', 'Dance', 'Combat'].map((clip) => (
                      <button
                        key={clip}
                        type="button"
                        onClick={() => setActiveAnim(clip)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          activeAnim === clip
                            ? 'bg-[#f5c518] text-black'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {clip}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Download & Remix Actions */}
            {asset && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <div className="text-xs font-bold text-slate-300">
                  Download Production 3D Formats
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(['glb', 'obj', 'stl', 'ply'] as const).map((fmt) => (
                    <a
                      key={fmt}
                      href={`/api/studio/assets/${asset.id}/export?format=${fmt}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold uppercase text-white hover:bg-[#f5c518] hover:text-black transition"
                    >
                      <Download className="h-3.5 w-3.5" /> .{fmt}
                    </a>
                  ))}
                </div>

                <Link
                  href="/workspace/generate"
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Remix in 3D Workspace
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
