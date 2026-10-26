'use client';

import React, { useRef, useState } from 'react';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import Viewport3D from '@/components/three/Viewport3D';
import {
  synthesizeProceduralMesh,
  type ProceduralMeshData,
} from '@/lib/engine3d/generator';
import {
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  Box,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const POPULAR_PAIRS = [
  { from: 'OBJ', to: 'GLB', desc: 'Wavefront OBJ to binary glTF 2.0' },
  { from: 'GLB', to: 'OBJ', desc: 'glTF 2.0 binary to Wavefront OBJ' },
  { from: 'FBX', to: 'GLB', desc: 'Autodesk FBX to WebGL-ready GLB' },
  { from: 'STL', to: 'GLB', desc: '3D Print STL to textured GLB' },
  { from: 'GLB', to: 'STL', desc: 'GLB mesh to watertight 3D print STL' },
  { from: 'PLY', to: 'GLB', desc: 'Point/Polygon PLY to binary GLB' },
  { from: 'GLB', to: 'PLY', desc: 'GLB mesh to Stanford PLY ASCII' },
  { from: 'OBJ', to: 'STL', desc: 'Wavefront OBJ to 3D slicer STL' },
];

export default function Free3DConverterPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<'glb' | 'obj' | 'stl' | 'ply'>('glb');
  const [converting, setConverting] = useState(false);
  const [convertedResult, setConvertedResult] = useState<{
    filename: string;
    sizeBytes: number;
    url: string;
  } | null>(null);
  const [previewMesh, setPreviewMesh] = useState<ProceduralMeshData>(
    () =>
      synthesizeProceduralMesh({
        prompt: 'Armored Cyber Valkyrie Showcase Mesh',
        topology: 'TRIANGLE',
      }).meshData
  );

  const handleLoadSampleObj = () => {
    const sampleObj = [
      '# Tripo 3D Sample Cube OBJ',
      'v -0.6 -0.6  0.6',
      'v  0.6 -0.6  0.6',
      'v  0.6  0.6  0.6',
      'v -0.6  0.6  0.6',
      'v -0.6 -0.6 -0.6',
      'v  0.6 -0.6 -0.6',
      'v  0.6  0.6 -0.6',
      'v -0.6  0.6 -0.6',
      'f 1 2 3 4',
      'f 8 7 6 5',
      'f 4 3 7 8',
      'f 5 6 2 1',
      'f 2 6 7 3',
      'f 5 1 4 8',
    ].join('\n');
    const file = new File([sampleObj], 'sample-cube.obj', { type: 'text/plain' });
    setSelectedFile(file);
    setConvertedResult(null);
  };

  const handleRunConversion = async () => {
    setConverting(true);
    try {
      const form = new FormData();
      if (selectedFile) {
        form.append('file', selectedFile);
      } else {
        const sampleBlob = new Blob(
          [
            'v -0.5 -0.5 0.5\nv 0.5 -0.5 0.5\nv 0.5 0.5 0.5\nv -0.5 0.5 0.5\nf 1 2 3 4\n',
          ],
          { type: 'text/plain' }
        );
        form.append('file', new File([sampleBlob], 'tripo-model.obj'));
      }
      form.append('targetFormat', targetFormat);

      const res = await fetch('/api/converter', {
        method: 'POST',
        body: form,
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const baseName = (selectedFile?.name || 'tripo-model').replace(/\.[^.]+$/, '');
        setConvertedResult({
          filename: `${baseName}.${targetFormat}`,
          sizeBytes: blob.size,
          url,
        });
      }
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="mx-auto flex-1 max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-14">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3.5 py-1 text-xs font-bold text-[#f5c518]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>100% Free Online 3D Format Converter • Zero Sign-Up Required</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Free Online 3D File Converter
          </h1>
          <p className="text-sm text-slate-400">
            Convert 3D models between <strong className="text-white">GLB</strong>,{' '}
            <strong className="text-white">OBJ</strong>,{' '}
            <strong className="text-white">STL</strong>,{' '}
            <strong className="text-white">PLY</strong>, and{' '}
            <strong className="text-white">FBX</strong> with instant interactive 3D preview.
          </p>
        </div>

        {/* Converter Interactive Workspace */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Upload & Format Controls */}
          <div className="lg:col-span-6 flex flex-col justify-between rounded-3xl border border-white/10 bg-[#11131b] p-6 sm:p-8 space-y-6">
            <div className="space-y-5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".glb,.gltf,.obj,.stl,.ply,.fbx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setSelectedFile(f);
                    setConvertedResult(null);
                    setPreviewMesh(
                      synthesizeProceduralMesh({
                        prompt: f.name,
                        topology: 'TRIANGLE',
                      }).meshData
                    );
                  }
                }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/20 bg-[#171a24] p-6 text-center hover:border-[#f5c518] transition"
              >
                <Upload className="mb-3 h-8 w-8 text-[#f5c518]" />
                {selectedFile ? (
                  <div>
                    <div className="text-sm font-bold text-white">
                      {selectedFile.name}
                    </div>
                    <div className="mt-1 text-xs text-emerald-400">
                      Ready to convert ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm font-bold text-white">
                      Drag & drop your 3D file here, or click to browse
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Supports .GLB, .GLTF, .OBJ, .STL, .PLY, .FBX (Max 100MB)
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  data-testid="btn-load-sample-obj"
                  onClick={handleLoadSampleObj}
                  className="text-xs font-semibold text-[#f5c518] hover:underline"
                >
                  Don&apos;t have a file handy? Load sample-cube.obj →
                </button>
              </div>

              {/* Target Format Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Convert Target Format
                </label>
                <div className="grid grid-cols-4 gap-2.5">
                  {(['glb', 'obj', 'stl', 'ply'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      data-testid={`convert-target-${fmt}`}
                      onClick={() => setTargetFormat(fmt)}
                      className={`rounded-xl border py-3 text-xs font-extrabold uppercase transition ${
                        targetFormat === fmt
                          ? 'border-[#f5c518] bg-[#f5c518] text-black shadow-lg shadow-[#f5c518]/20'
                          : 'border-white/10 bg-[#171a24] text-slate-300 hover:border-white/30'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <button
                type="button"
                data-testid="btn-convert-now"
                disabled={converting}
                onClick={handleRunConversion}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3.5 text-sm font-extrabold text-black hover:bg-[#fde047] transition"
              >
                {converting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Converting to .{targetFormat.toUpperCase()}...
                  </>
                ) : (
                  <>
                    <span>Convert to .{targetFormat.toUpperCase()}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {convertedResult && (
                <div
                  data-testid="conversion-result-card"
                  className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <div className="text-xs font-bold text-white">
                        {convertedResult.filename}
                      </div>
                      <div className="text-[11px] text-emerald-300">
                        Converted ({convertedResult.sizeBytes.toLocaleString()} bytes)
                      </div>
                    </div>
                  </div>
                  <a
                    href={convertedResult.url}
                    download={convertedResult.filename}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-extrabold text-black hover:bg-emerald-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Live 3D Preview Viewport */}
          <div className="lg:col-span-6 h-[460px] overflow-hidden rounded-3xl border border-white/10 bg-[#11131b]">
            <Viewport3D
              meshData={previewMesh}
              modelName={selectedFile?.name || 'sample-cube.obj'}
              topology="TRIANGLE"
              vertices={1240}
              faces={2480}
            />
          </div>
        </div>

        {/* Popular Conversion Pairs Matrix */}
        <section className="space-y-5">
          <h2 className="text-xl font-extrabold text-white">
            Supported 3D Format Conversion Pairs
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {POPULAR_PAIRS.map((pair) => (
              <button
                key={`${pair.from}-${pair.to}`}
                type="button"
                onClick={() =>
                  setTargetFormat(pair.to.toLowerCase() as 'glb' | 'obj' | 'stl' | 'ply')
                }
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#11131b] p-4 text-left hover:border-[#f5c518]/50 transition"
              >
                <div>
                  <div className="flex items-center gap-2 text-sm font-extrabold text-white">
                    <Box className="h-4 w-4 text-[#f5c518]" />
                    <span>
                      {pair.from} to {pair.to}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">{pair.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
              </button>
            ))}
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
