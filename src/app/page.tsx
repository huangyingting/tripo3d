'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import Viewport3D from '@/components/three/Viewport3D';
import { synthesizeProceduralMesh } from '@/lib/engine3d/generator';
import {
  Sparkles,
  ArrowRight,
  Box,
  Scissors,
  Grid,
  Palette,
  Bone,
  Cpu,
  CheckCircle2,
  Zap,
  ShieldCheck,
} from 'lucide-react';

const HERO_PRESETS = [
  {
    title: 'Armored Cyber Valkyrie',
    prompt: 'Armored Cyber Valkyrie character with glowing golden visor, T-pose',
    mode: 'Smart Mesh P2.0',
    topology: 'QUAD' as const,
  },
  {
    title: 'Celestial Guardian Dragon',
    prompt: 'Celestial Guardian Dragon creature with crystal wings and obsidian scales',
    mode: 'Tripo H3.1 Ultra',
    topology: 'TRIANGLE' as const,
  },
  {
    title: 'Tactical Mars Rover',
    prompt: 'Tactical Sci-Fi Rover vehicle with 4 rugged wheels and solar radar dish',
    mode: 'Tripo H3.1 Parts',
    topology: 'TRIANGLE' as const,
  },
];

export default function MarketingHomePage() {
  const [activePreset, setActivePreset] = useState(0);
  const current = HERO_PRESETS[activePreset];
  const heroMesh = React.useMemo(
    () =>
      synthesizeProceduralMesh({
        prompt: current.prompt,
        topology: current.topology,
        isRigged: true,
      }).meshData,
    [current]
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(ellipse_at_top,#1f2336_0%,#070709_70%)] py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-4 py-1.5 text-xs font-extrabold text-[#f5c518]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>NEW: Tripo H3.1 Ultra & Smart Mesh P2.0 Quad Engine</span>
                </div>

                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-[1.08]">
                  Create <span className="text-[#f5c518]">Production 3D</span> from Image & Text in Seconds.
                </h1>

                <p className="text-base text-slate-300 leading-relaxed max-w-xl">
                  The all-in-one AI 3D Studio for game developers, 3D printing creators, and VFX teams. Generate clean quad topology, segment sub-parts, bake 8K PBR textures, and auto-rig characters in one unified WebGL workspace.
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link
                    href="/workspace/generate"
                    className="inline-flex items-center gap-2 rounded-full bg-[#f5c518] px-7 py-3.5 text-sm font-extrabold text-black shadow-xl shadow-[#f5c518]/25 hover:bg-[#fde047] transition"
                  >
                    <span>Launch 3D Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/studio"
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 transition"
                  >
                    Explore Studio Showcase
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6 text-xs">
                  <div>
                    <div className="text-xl font-black text-white">10s</div>
                    <div className="text-slate-400">Image/Text to 3D Mesh</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-[#f5c518]">P2.0 Quad</div>
                    <div className="text-slate-400">Game-Ready Edge Flow</div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-white">8K PBR</div>
                    <div className="text-slate-400">Albedo, Normal & Metal</div>
                  </div>
                </div>
              </div>

              {/* Interactive Live 3D Hero Viewport */}
              <div className="lg:col-span-6 space-y-3">
                <div className="h-[460px] overflow-hidden rounded-3xl border border-white/15 bg-[#101219] shadow-2xl">
                  <Viewport3D
                    meshData={heroMesh}
                    modelName={current.title}
                    topology={current.topology}
                    vertices={16400}
                    faces={28900}
                    isSegmented
                    isRigged
                    activeAnimation="Idle"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {HERO_PRESETS.map((p, idx) => (
                      <button
                        key={p.title}
                        type="button"
                        onClick={() => setActivePreset(idx)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                          activePreset === idx
                            ? 'bg-[#f5c518] text-black'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        {p.title}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Interactive WebGL • Drag to Orbit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7-Stage Pipeline Feature Grid */}
        <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              End-to-End 7-Stage AI 3D Production Pipeline
            </h2>
            <p className="text-sm text-slate-400">
              Every stage of traditional 3D modeling—from reference concept to segmented, retopologized, UV-unwrapped, 8K-textured, rigged assets—automated inside Tripo Studio.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                icon: Box,
                title: '1. HD Model (H3.1) & Smart Mesh (P2.0)',
                desc: 'Switch seamlessly between ultra-crisp 8K high-detail meshes and native isotropic Quad topology cages.',
                href: '/features/text-to-3d-model',
              },
              {
                icon: Scissors,
                title: '2. Semantic AI Part Segmentation',
                desc: 'Automatically split meshes into semantic sub-components and run AI Complete to cap interior geometry.',
                href: '/features/smart-retopology',
              },
              {
                icon: Grid,
                title: '3. Smart Retopology & Smart UV',
                desc: 'Target exact polygon budgets (3k to 100k) and unwrap distortion-free UV charts for <=80k tris / <=40k quads.',
                href: '/features/smart-retopology',
              },
              {
                icon: Palette,
                title: '4. 8K PBR Texture & Magic Brush',
                desc: 'De-light baked shadows, synthesize metallic/roughness PBR maps, and repaint localized mesh regions.',
                href: '/features/ai-texturing',
              },
              {
                icon: Bone,
                title: '5. Auto Rigging & Motion Library',
                desc: 'Bind a 16-bone humanoid biped skeleton in one click and apply Walk, Run, Jump, Dance, and Combat clips.',
                href: '/features/3d-rigging-animation',
              },
              {
                icon: Cpu,
                title: '6. OpenAPI v3 & 11 DCC Bridges',
                desc: 'Export directly to Blender, Unreal 5, Unity, Maya, 3ds Max, ZBrush, Godot, Roblox, or integrate via REST API.',
                href: '/platform',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group rounded-3xl border border-white/10 bg-[#11131b] p-6 hover:border-[#f5c518]/50 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5c518]/15 text-[#f5c518]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-base font-bold text-white group-hover:text-[#f5c518] transition">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
                  <div className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-[#f5c518]">
                    Explore Feature <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Enterprise Invite-Only Governance Banner */}
        <section className="border-t border-white/10 bg-[#0c0e14] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-between gap-6 rounded-3xl border border-white/10 bg-gradient-to-r from-[#141722] to-[#1d190e] p-8 md:flex-row">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f5c518]">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Production Invite-Only Admission & RBAC Governance</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">
                  Ready for Production Teams & Enterprise Pipelines
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Single-use expiring invitation codes, role-based access control (Admin, Creator, Viewer), instant session revocation, and immutable security audit logging—with zero pre-seeded demo accounts.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-full bg-[#f5c518] px-6 py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
                >
                  Redeem Invitation Code
                </Link>
                <Link
                  href="/3d-tools/convert"
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-bold text-white hover:bg-white/10"
                >
                  Try Free 3D Converter
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
