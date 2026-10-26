'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import Viewport3D from '@/components/three/Viewport3D';
import type { ProceduralMeshData } from '@/lib/engine3d/generator';
import {
  Sparkles,
  Search,
  Heart,
  Download,
  ArrowRight,
  Box,
  Grid,
  Wand2,
  Eye,
} from 'lucide-react';

const GALLERY_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'game_assets', label: 'Game Assets' },
  { id: '3d_printing', label: '3D Printing' },
  { id: 'vehicle', label: 'Vehicles' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'animal', label: 'Creatures & Pets' },
  { id: 'props', label: 'Sci-Fi & Props' },
];

interface GalleryModel {
  id: string;
  name: string;
  prompt: string | null;
  category: string;
  generationMode: string;
  aiModelVersion: string;
  topology: string;
  vertices: number;
  faces: number;
  pbrEnabled: boolean;
  textureQuality: string;
  isSegmented: boolean;
  isRigged: boolean;
  likesCount: number;
  viewsCount: number;
  geometryJson: string | null;
}

export default function StudioHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [quickMode, setQuickMode] = useState<'3d' | 'image'>('3d');
  const [quickPrompt, setQuickPrompt] = useState(
    'Cyberpunk Ronin warrior in full armor, glowing neon katana, 8K PBR'
  );
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<'popular' | 'latest'>('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [models, setModels] = useState<GalleryModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<GalleryModel | null>(null);

  const loadGallery = async () => {
    const params = new URLSearchParams({
      category,
      sort,
      ...(searchQuery ? { q: searchQuery } : {}),
    });
    const res = await fetch(`/api/gallery?${params.toString()}`);
    const data = await res.json();
    if (data.models) {
      setModels(data.models);
      if (!selectedModel && data.models.length > 0) {
        setSelectedModel(data.models[0]);
      }
    }
  };

  useEffect(() => {
    loadGallery();
  }, [category, sort]);

  const handleLike = async (id: string) => {
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetId: id }),
    });
    if (res.ok) {
      setModels((prev) =>
        prev.map((m) => (m.id === id ? { ...m, likesCount: m.likesCount + 1 } : m))
      );
    }
  };

  const activeMesh: ProceduralMeshData | null = React.useMemo(() => {
    if (!selectedModel?.geometryJson) return null;
    try {
      return JSON.parse(selectedModel.geometryJson) as ProceduralMeshData;
    } catch {
      return null;
    }
  }, [selectedModel]);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        {/* Hero Quick Generator Banner matching studio.tripo3d.ai/home */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151824] via-[#0e1017] to-[#1a160c] p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3.5 py-1 text-xs font-bold text-[#f5c518]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Tripo H3.1 Ultra + Smart Mesh P2.0</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                What 3D world will you build today?
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl">
                Generate production-ready 3D models with clean Quad topology, semantic part segmentation, 8K PBR textures, and auto-rigging in seconds.
              </p>

              {/* Quick Mode Toggle: Generate 3D Model vs Generate Image */}
              <div className="inline-flex rounded-full border border-white/10 bg-[#0b0c10] p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setQuickMode('3d')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                    quickMode === '3d'
                      ? 'bg-[#f5c518] text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Box className="h-3.5 w-3.5" />
                  Generate 3D Model
                </button>
                <button
                  type="button"
                  onClick={() => setQuickMode('image')}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${
                    quickMode === 'image'
                      ? 'bg-[#f5c518] text-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Generate Image
                </button>
              </div>

              {/* Prompt Input Box */}
              <div className="flex flex-col sm:flex-row gap-2.5 rounded-2xl border border-white/15 bg-[#0b0d13] p-2">
                <input
                  type="text"
                  value={quickPrompt}
                  onChange={(e) => setQuickPrompt(e.target.value)}
                  placeholder="Describe a character, game prop, vehicle, or architectural piece..."
                  className="flex-1 bg-transparent px-3 py-2 text-sm text-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/workspace/generate?stage=${quickMode === 'image' ? 'image' : 'model'}`
                    )
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-6 py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <span>Open in 3D Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Interactive 3D Preview Card on Right */}
            <div className="lg:col-span-5 h-72 sm:h-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0c10] relative">
              <Viewport3D
                meshData={activeMesh}
                modelName={selectedModel?.name}
                topology={selectedModel?.topology}
                vertices={selectedModel?.vertices}
                faces={selectedModel?.faces}
                isSegmented={selectedModel?.isSegmented}
                isRigged={selectedModel?.isRigged}
                compact
                showControls={false}
              />
              {selectedModel && (
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#121318]/90 px-3 py-2 text-xs backdrop-blur">
                  <div>
                    <div className="font-bold text-white">{selectedModel.name}</div>
                    <div className="text-[10px] text-slate-400">
                      {selectedModel.aiModelVersion} • {selectedModel.topology} •{' '}
                      {selectedModel.faces.toLocaleString()} faces
                    </div>
                  </div>
                  <Link
                    href={`/3d-model/${selectedModel.id}`}
                    className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-[#f5c518] hover:bg-white/20"
                  >
                    Inspect 3D →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Community Showcase Gallery */}
        <section className="space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white">
                Community 3D Showcase
              </h2>
              <p className="text-xs text-slate-400">
                Explore, inspect, and download real GLB/OBJ/STL assets created with Tripo H3.1 & P2.0
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadGallery()}
                  placeholder="Search 3D models..."
                  className="rounded-full border border-white/10 bg-[#12141c] py-1.5 pl-9 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                />
              </div>

              <div className="inline-flex rounded-full border border-white/10 bg-[#12141c] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSort('popular')}
                  className={`rounded-full px-3 py-1 ${
                    sort === 'popular' ? 'bg-[#f5c518] text-black' : 'text-slate-400'
                  }`}
                >
                  Popular
                </button>
                <button
                  type="button"
                  onClick={() => setSort('latest')}
                  className={`rounded-full px-3 py-1 ${
                    sort === 'latest' ? 'bg-[#f5c518] text-black' : 'text-slate-400'
                  }`}
                >
                  Latest
                </button>
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {GALLERY_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  category === cat.id
                    ? 'border-[#f5c518] bg-[#f5c518] text-black font-bold'
                    : 'border-white/10 bg-[#12141c] text-slate-300 hover:border-white/25'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Gallery Cards Grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {models.map((item) => {
              let itemMesh: ProceduralMeshData | null = null;
              try {
                if (item.geometryJson) itemMesh = JSON.parse(item.geometryJson);
              } catch {}
              const primaryColor = itemMesh?.pbrMaps?.albedoTint || '#f5c518';

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedModel(item)}
                  className={`group flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border bg-[#12141c] transition hover:-translate-y-0.5 ${
                    selectedModel?.id === item.id
                      ? 'border-[#f5c518] ring-1 ring-[#f5c518]/50'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  {/* Visual Preview Header */}
                  <div className="relative flex h-44 flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#222638_0%,#0c0e14_80%)] p-4">
                    <div className="absolute left-3 top-3 flex gap-1.5">
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-[#f5c518] backdrop-blur">
                        {item.aiModelVersion}
                      </span>
                      <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200 backdrop-blur">
                        {item.topology}
                      </span>
                    </div>

                    {/* Stylized 3D Wireframe/Mesh Emblem */}
                    <div
                      className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/15 shadow-2xl transition group-hover:scale-110"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${primaryColor}55, #12141c)`,
                      }}
                    >
                      <Grid className="h-9 w-9 text-white/90" />
                    </div>

                    <div className="mt-3 text-[11px] font-mono text-slate-400">
                      {item.faces.toLocaleString()} faces • {item.textureQuality} PBR
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="truncate text-sm font-bold text-white">
                        {item.name}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-400">
                        {item.prompt}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                      <div className="flex items-center gap-3 text-slate-400">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(item.id);
                          }}
                          className="flex items-center gap-1 hover:text-rose-400 transition"
                        >
                          <Heart className="h-3.5 w-3.5" />
                          <span>{item.likesCount}</span>
                        </button>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{item.viewsCount}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/studio/assets/${item.id}/export?format=glb`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-white/10 p-1.5 text-slate-200 hover:bg-[#f5c518] hover:text-black transition"
                          title="Download .GLB"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <Link
                          href={`/3d-model/${item.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-[#f5c518]/15 px-2.5 py-1 text-[11px] font-bold text-[#f5c518] hover:bg-[#f5c518] hover:text-black transition"
                        >
                          3D View
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
