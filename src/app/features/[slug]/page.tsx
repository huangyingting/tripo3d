'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import Viewport3D from '@/components/three/Viewport3D';
import { synthesizeProceduralMesh } from '@/lib/engine3d/generator';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

const FEATURE_META: Record<
  string,
  {
    title: string;
    subtitle: string;
    prompt: string;
    topology: 'QUAD' | 'TRIANGLE';
    bullets: string[];
  }
> = {
  'text-to-3d-model': {
    title: 'AI Text to 3D Model Generator',
    subtitle:
      'Turn natural language descriptions into production-ready 3D meshes with 8K PBR textures in 10 seconds.',
    prompt: 'Armored Cyber Valkyrie character with glowing golden visor',
    topology: 'TRIANGLE',
    bullets: [
      'Tripo H3.1 Ultra & H3.0 Fast foundation models',
      'Prompt enhancer & negative prompt controls',
      'Up to 4-model batch generation per prompt',
    ],
  },
  'image-to-3d-model': {
    title: 'Image & Multi-View to 3D Model',
    subtitle:
      'Upload a single reference photo or 4 orthogonal views (Front, Left, Back, Right) for faithful 3D reconstruction.',
    prompt: 'Tactical Sci-Fi Rover vehicle with 4 rugged wheels',
    topology: 'TRIANGLE',
    bullets: [
      'Automatic background removal & de-lighting',
      'Multi-view camera fusion for zero back-side hallucination',
      'Direct integration with Stage 1 Reference Image Generator',
    ],
  },
  'ai-texturing': {
    title: 'AI 8K PBR Texturing & Magic Brush',
    subtitle:
      'Generate physically-based Albedo, Metallic, Roughness, and Normal maps up to 8K Ultra resolution.',
    prompt: 'Medieval Rune Greatsword weapon with gold crossguard',
    topology: 'QUAD',
    bullets: [
      '2K, 4K, and 8K (Beta) PBR texture synthesis',
      'Magic Brush localized part repainting',
      'Automatic shadow & specular de-lighting',
    ],
  },
  'smart-retopology': {
    title: 'Smart Mesh P2.0 Quad Retopology & Segmentation',
    subtitle:
      'Generate clean edge-loop Quad topology and segment meshes into watertight semantic parts.',
    prompt: 'Celestial Guardian Dragon creature with crystal wings',
    topology: 'QUAD',
    bullets: [
      'Smart Mesh P2.0 & P1.0 low-poly quad cages',
      'Semantic part segmentation & AI Complete interior filling',
      'Smart UV unwrapping for <=80,000 tris / <=40,000 quads',
    ],
  },
  '3d-rigging-animation': {
    title: 'Automated 3D Rigging & Motion Library',
    subtitle:
      'Bind a 16-bone humanoid skeleton with automatic skin weights and preview game-ready motion clips.',
    prompt: 'Armored Cyber Valkyrie character in T-pose',
    topology: 'QUAD',
    bullets: [
      'One-click Biped & Quadruped auto-rigging',
      'Built-in Idle, Walk, Run, Jump, Dance, and Combat clips',
      'Export rigged GLB directly to Unreal, Unity, and Blender',
    ],
  },
};

export default function FeatureDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || 'text-to-3d-model';
  const meta = FEATURE_META[slug] || FEATURE_META['text-to-3d-model'];

  const mesh = React.useMemo(
    () =>
      synthesizeProceduralMesh({
        prompt: meta.prompt,
        topology: meta.topology,
        isRigged: true,
      }).meshData,
    [meta]
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="mx-auto flex-1 max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f5c518]/15 px-3.5 py-1 text-xs font-bold text-[#f5c518]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tripo 3D Studio Pipeline Feature</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white">
              {meta.title}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">{meta.subtitle}</p>
            <ul className="space-y-2.5 text-xs text-slate-200">
              {meta.bullets.map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#f5c518]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link
                href="/workspace/generate"
                className="inline-flex items-center gap-2 rounded-full bg-[#f5c518] px-7 py-3.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
              >
                <span>Open in 3D Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]">
            <Viewport3D
              meshData={mesh}
              modelName={meta.title}
              topology={meta.topology}
              vertices={15200}
              faces={26400}
              isSegmented
              isRigged
              activeAnimation="Idle"
            />
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
