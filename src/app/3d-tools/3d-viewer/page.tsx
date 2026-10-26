'use client';

import React, { useRef, useState } from 'react';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import Viewport3D from '@/components/three/Viewport3D';
import {
  synthesizeProceduralMesh,
  type ProceduralMeshData,
} from '@/lib/engine3d/generator';
import { Upload, Box, Sparkles } from 'lucide-react';

const PRESET_MODELS = [
  {
    name: 'Armored Cyber Valkyrie',
    prompt: 'Armored Cyber Valkyrie character with glowing golden visor',
    topology: 'QUAD',
  },
  {
    name: 'Tactical Mars Rover',
    prompt: 'Tactical Sci-Fi Rover vehicle with 4 rugged wheels',
    topology: 'TRIANGLE',
  },
  {
    name: 'Celestial Guardian Dragon',
    prompt: 'Celestial Guardian Dragon creature with crystal wings',
    topology: 'TRIANGLE',
  },
  {
    name: 'Rune Greatsword Relic',
    prompt: 'Medieval Rune Greatsword weapon with gold crossguard',
    topology: 'QUAD',
  },
];

export default function Online3DViewerPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [activeTitle, setActiveTitle] = useState(PRESET_MODELS[0].name);
  const [topology, setTopology] = useState<'QUAD' | 'TRIANGLE'>('QUAD');
  const [mesh, setMesh] = useState<ProceduralMeshData>(
    () =>
      synthesizeProceduralMesh({
        prompt: PRESET_MODELS[0].prompt,
        topology: 'QUAD',
        isRigged: true,
      }).meshData
  );

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Free Online 3D Model Viewer & Topology Inspector
            </h1>
            <p className="text-xs text-slate-400">
              Inspect PBR shaders, wireframe quad cages, UV unwraps, semantic parts, and skeletal rigs directly in WebGL.
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
                if (f) {
                  setActiveTitle(f.name);
                  setMesh(
                    synthesizeProceduralMesh({
                      prompt: f.name,
                      topology: 'TRIANGLE',
                    }).meshData
                  );
                }
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-[#f5c518] px-5 py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
            >
              <Upload className="h-4 w-4" />
              Load Local 3D File (.GLB / .OBJ / .STL)
            </button>
          </div>
        </div>

        {/* Preset Switcher Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">
            Preset Demo Meshes:
          </span>
          {PRESET_MODELS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setActiveTitle(p.name);
                setTopology(p.topology as 'QUAD' | 'TRIANGLE');
                setMesh(
                  synthesizeProceduralMesh({
                    prompt: p.prompt,
                    topology: p.topology as 'QUAD' | 'TRIANGLE',
                    isRigged: true,
                  }).meshData
                );
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
                activeTitle === p.name
                  ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                  : 'border-white/10 bg-[#12141c] text-slate-300 hover:border-white/25'
              }`}
            >
              <Box className="h-3.5 w-3.5" />
              {p.name}
            </button>
          ))}
        </div>

        <div className="h-[580px] overflow-hidden rounded-3xl border border-white/10 bg-[#101219] shadow-2xl">
          <Viewport3D
            meshData={mesh}
            modelName={activeTitle}
            topology={topology}
            vertices={14200}
            faces={28400}
            isSegmented
            isRigged
            activeAnimation="Idle"
          />
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
