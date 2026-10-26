'use client';

import React from 'react';
import Link from 'next/link';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import { Cpu, Sparkles, Layers, GitBranch, ArrowRight } from 'lucide-react';

const PAPERS = [
  {
    tag: 'Tripo H3.1 Foundation Model (2026)',
    title: 'Hybrid Sparse-Voxel & Signed Distance Field Transformer for Ultra-HD 3D Synthesis',
    summary:
      'Delivers crisp geometric creases, 8K de-lighted PBR material decomposition, and multi-view consistency in under 10 seconds.',
  },
  {
    tag: 'Smart Mesh P2.0',
    title: 'Native Autoregressive Quad-Dominant Mesh Generation with Edge-Loop Alignment',
    summary:
      'Directly synthesizes animation-ready quad topology cages without post-hoc decimation artifacts.',
  },
  {
    tag: 'HoloPart & Part-Completion',
    title: '3D Semantic Part Segmentation and Amodal Occluded Surface Completion',
    summary:
      'Decomposes complex 3D assets into independent watertight sub-meshes ready for kitbashing and 3D printing.',
  },
  {
    tag: 'TripoSR & TripoSG Open-Source',
    title: 'Fast 3D Object Reconstruction from Single Images with Large Reconstruction Models',
    summary:
      'Open-weights foundation models powering community research and real-time 3D prototyping.',
  },
];

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="mx-auto flex-1 max-w-6xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f5c518]/15 px-3.5 py-1 text-xs font-bold text-[#f5c518]">
            <Cpu className="h-3.5 w-3.5" />
            <span>Tripo AI Foundation Research</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
            Pioneering Spatial & 3D Foundation Models
          </h1>
          <p className="max-w-2xl text-sm text-slate-400 leading-relaxed">
            Explore the neural architectures behind Tripo H3.1 Ultra, Smart Mesh P2.0 native quad generation, and semantic part completion.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PAPERS.map((p) => (
            <div
              key={p.title}
              className="flex flex-col justify-between rounded-3xl border border-white/10 bg-[#11131b] p-7 space-y-4"
            >
              <div className="space-y-2.5">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-[#f5c518]">
                  {p.tag}
                </span>
                <h2 className="text-lg font-extrabold text-white">{p.title}</h2>
                <p className="text-xs text-slate-400 leading-relaxed">{p.summary}</p>
              </div>
              <Link
                href="/workspace/generate"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f5c518] hover:underline"
              >
                Test Model in 3D Workspace <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
