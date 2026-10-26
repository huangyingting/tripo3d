'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import { Trophy, Sparkles, BookOpen, Award, ArrowRight, Zap } from 'lucide-react';

const CHALLENGES = [
  {
    title: 'Smart Mesh P2.0 Game Character Jam',
    prize: '50,000 ⚡ + Studio Max Annual Pass',
    deadline: 'Active Challenge',
    participants: 1420,
    tag: 'P2.0 Quad Topology',
  },
  {
    title: '8K PBR Sci-Fi Props & Weapons Sprint',
    prize: '25,000 ⚡ + Featured Showcase Badge',
    deadline: 'Active Challenge',
    participants: 890,
    tag: 'Tripo H3.1 Ultra',
  },
  {
    title: '3D Printable Tabletop Miniatures Contest',
    prize: '15,000 ⚡ + Watertight STL Spotlight',
    deadline: 'Active Challenge',
    participants: 640,
    tag: 'Segment & Fill Parts',
  },
];

const GUIDES = [
  {
    title: 'Mastering Smart Mesh P2.0 for Unreal Engine 5 & Blender',
    duration: '6 min guide',
    summary:
      'Learn how to generate clean isotropic quad cages under 10k polygons and export directly via DCC Bridge.',
  },
  {
    title: 'Semantic Part Segmentation & Magic Brush 8K Retexturing',
    duration: '5 min guide',
    summary:
      'Decompose complex triangle meshes into sub-parts, cap occluded geometry, and repaint materials.',
  },
  {
    title: 'Automated Biped Rigging & Game Animation Retargeting',
    duration: '4 min guide',
    summary:
      'Bind a 16-bone skeleton in one click and preview Walk, Run, Jump, and Combat cycles in the browser.',
  },
];

export default function CreatorHubPage() {
  const [user, setUser] = useState<ViewerUser | null>(null);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#181b28] via-[#12141d] to-[#231d0c] p-8 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5c518]/15 px-3.5 py-1 text-xs font-bold text-[#f5c518]">
            <Trophy className="h-3.5 w-3.5" />
            <span>Tripo Creator Hub & Community Bounties</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold text-white">
            Level Up Your 3D Pipeline & Earn Credits
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Participate in 3D topology challenges, master DCC Bridge workflows for Blender/Unreal/Unity, and share CC-BY 4.0 assets.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/workspace/generate"
              className="inline-flex items-center gap-2 rounded-full bg-[#f5c518] px-6 py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
            >
              <Sparkles className="h-4 w-4" /> Submit a 3D Model
            </Link>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-xs font-bold text-white hover:bg-white/10"
            >
              Browse Community Showcase
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Award className="h-5 w-5 text-[#f5c518]" />
            <span>Active 3D Creation Challenges</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {CHALLENGES.map((ch) => (
              <div
                key={ch.title}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#12141c] p-6"
              >
                <div>
                  <span className="rounded-full bg-[#f5c518]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#f5c518]">
                    {ch.tag}
                  </span>
                  <h3 className="mt-3 text-base font-bold text-white">{ch.title}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <Zap className="h-3.5 w-3.5" /> {ch.prize}
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {ch.participants.toLocaleString()} creators participating
                  </p>
                </div>
                <Link
                  href="/workspace/generate"
                  className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-[#f5c518] hover:text-black transition"
                >
                  Enter Challenge <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-sky-400" />
            <span>Production Pipeline Tutorials</span>
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {GUIDES.map((g) => (
              <div
                key={g.title}
                className="rounded-2xl border border-white/10 bg-[#12141c] p-6 space-y-2.5"
              >
                <div className="text-[11px] font-mono text-[#f5c518]">{g.duration}</div>
                <h3 className="text-sm font-bold text-white">{g.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{g.summary}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
