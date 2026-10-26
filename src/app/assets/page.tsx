'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import Viewport3D from '@/components/three/Viewport3D';
import type { ProceduralMeshData } from '@/lib/engine3d/generator';
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  Trash2,
  Star,
  Sparkles,
  Box,
  ExternalLink,
} from 'lucide-react';

interface AssetRecord {
  id: string;
  name: string;
  prompt: string | null;
  category: string;
  generationMode: string;
  inputType: string;
  aiModelVersion: string;
  topology: string;
  vertices: number;
  faces: number;
  textureQuality: string;
  isSegmented: boolean;
  isRigged: boolean;
  isFavorite: boolean;
  geometryJson: string | null;
  createdAt: string;
}

export default function StudioAssetsPage() {
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [selected, setSelected] = useState<AssetRecord | null>(null);
  const [tab, setTab] = useState<'all' | 'generated' | 'uploaded' | 'favorites'>('all');
  const [search, setSearch] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);

  const loadAssets = async () => {
    const res = await fetch('/api/studio/assets?scope=all');
    const data = await res.json();
    if (data.assets) {
      setAssets(data.assets);
      if (!selected && data.assets.length > 0) {
        setSelected(data.assets[0]);
      }
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/studio/assets', { method: 'POST', body: form });
    const data = await res.json();
    if (res.ok && data.asset) {
      setAssets((prev) => [data.asset, ...prev]);
      setSelected(data.asset);
    }
  };

  const handleToggleFavorite = async (asset: AssetRecord) => {
    const res = await fetch(`/api/studio/assets/${asset.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFavorite: !asset.isFavorite }),
    });
    if (res.ok) {
      setAssets((prev) =>
        prev.map((a) => (a.id === asset.id ? { ...a, isFavorite: !a.isFavorite } : a))
      );
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/studio/assets/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAssets((prev) => prev.filter((a) => a.id !== id));
      if (selected?.id === id) setSelected(null);
    }
  };

  const filteredAssets = assets.filter((a) => {
    if (tab === 'generated' && a.inputType === 'UPLOAD') return false;
    if (tab === 'uploaded' && a.inputType !== 'UPLOAD') return false;
    if (tab === 'favorites' && !a.isFavorite) return false;
    if (
      search &&
      !a.name.toLowerCase().includes(search.toLowerCase()) &&
      !(a.prompt || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const activeMesh: ProceduralMeshData | null = React.useMemo(() => {
    if (!selected?.geometryJson) return null;
    try {
      return JSON.parse(selected.geometryJson) as ProceduralMeshData;
    } catch {
      return null;
    }
  }, [selected]);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100">
      <StudioNavbar user={user} onUserUpdated={setUser} />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
              <FolderOpen className="h-6 w-6 text-[#f5c518]" />
              <span>My 3D Assets & Vault</span>
            </h1>
            <p className="text-xs text-slate-400">
              Manage generated and uploaded 3D meshes, inspect topology, and export to GLB, OBJ, STL, or PLY.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              ref={fileRef}
              type="file"
              accept=".glb,.obj,.stl,.ply"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-white hover:bg-white/10 transition"
            >
              <Upload className="h-3.5 w-3.5 text-[#f5c518]" />
              Upload 3D File
            </button>
            <Link
              href="/workspace/generate"
              className="flex items-center gap-1.5 rounded-full bg-[#f5c518] px-4 py-2 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
            >
              <Sparkles className="h-3.5 w-3.5" />
              New 3D Generation
            </Link>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
          <div className="flex gap-2">
            {(
              [
                { id: 'all', label: 'All Assets' },
                { id: 'generated', label: 'AI Generated' },
                { id: 'uploaded', label: 'Uploaded' },
                { id: 'favorites', label: 'Favorites' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  tab === t.id
                    ? 'bg-[#f5c518] text-black'
                    : 'bg-[#12141c] text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter assets by name or prompt..."
              className="w-full sm:w-64 rounded-full border border-white/10 bg-[#12141c] py-1.5 pl-9 pr-4 text-xs text-white focus:border-[#f5c518] focus:outline-none"
            />
          </div>
        </div>

        {/* Split Layout: Asset Grid + Live 3D Inspector */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredAssets.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  selected?.id === item.id
                    ? 'border-[#f5c518] bg-[#161925]'
                    : 'border-white/10 bg-[#11131b] hover:border-white/25'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Box className="h-4 w-4 text-[#f5c518]" />
                    <span className="font-bold text-sm text-white truncate">
                      {item.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(item);
                    }}
                    className={`p-1 ${
                      item.isFavorite ? 'text-[#f5c518]' : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </button>
                </div>

                <p className="mt-1.5 line-clamp-2 text-xs text-slate-400">
                  {item.prompt || 'Uploaded 3D Mesh'}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-[#f5c518]">
                    {item.aiModelVersion}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-slate-300">
                    {item.topology}
                  </span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-slate-300">
                    {item.faces.toLocaleString()} faces
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <div className="flex gap-1.5">
                    {(['glb', 'obj', 'stl'] as const).map((fmt) => (
                      <a
                        key={fmt}
                        href={`/api/studio/assets/${item.id}/export?format=${fmt}`}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded bg-white/10 px-2 py-1 text-[10px] font-bold uppercase text-white hover:bg-[#f5c518] hover:text-black transition"
                      >
                        .{fmt}
                      </a>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/3d-model/${item.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded p-1 text-slate-400 hover:text-white"
                      title="Open Detail Page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="rounded p-1 text-slate-500 hover:text-rose-400"
                      title="Delete Asset"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Live 3D Inspector */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]">
              <div className="h-96">
                <Viewport3D
                  meshData={activeMesh}
                  modelName={selected?.name}
                  topology={selected?.topology}
                  vertices={selected?.vertices}
                  faces={selected?.faces}
                  isSegmented={selected?.isSegmented}
                  isRigged={selected?.isRigged}
                />
              </div>
              {selected && (
                <div className="border-t border-white/10 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">{selected.name}</h3>
                      <p className="text-[11px] text-slate-400">
                        {selected.vertices.toLocaleString()} vertices •{' '}
                        {selected.faces.toLocaleString()} faces • {selected.textureQuality}
                      </p>
                    </div>
                    <Link
                      href="/workspace/generate"
                      className="rounded-full bg-[#f5c518] px-3.5 py-1.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
                    >
                      Edit in Workspace
                    </Link>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['glb', 'obj', 'stl', 'ply'] as const).map((fmt) => (
                      <a
                        key={fmt}
                        href={`/api/studio/assets/${selected.id}/export?format=${fmt}`}
                        className="flex items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-bold uppercase text-white hover:bg-[#f5c518] hover:text-black transition"
                      >
                        <Download className="h-3 w-3" /> {fmt}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
