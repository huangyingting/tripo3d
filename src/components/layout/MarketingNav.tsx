'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Sparkles,
  Box,
  Cpu,
  Image as ImageIcon,
  Layers,
  Bone,
  Wand2,
  ArrowRight,
  Menu,
  X,
} from 'lucide-react';

export function MarketingNavbar() {
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070709]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Logo + Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 border border-white/15">
              <svg viewBox="0 0 40 40" className="h-5 w-5">
                <path
                  d="M7 9 H33 L20 33 Z"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
                <path d="M20 9 L33 9 L26.5 21 Z" fill="#f5c518" />
              </svg>
            </div>
            <span className="text-lg font-extrabold tracking-wider text-white">
              TRIPO
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
            {/* Features Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setFeaturesOpen((v) => !v)}
                className="flex items-center gap-1 py-2 text-slate-300 hover:text-white transition"
              >
                Features <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
              {featuresOpen && (
                <div className="absolute left-0 top-full w-80 rounded-2xl border border-white/10 bg-[#121318] p-3 shadow-2xl">
                  <Link
                    href="/features/text-to-3d-model"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Sparkles className="mt-0.5 h-5 w-5 text-[#f5c518]" />
                    <div>
                      <div className="font-semibold text-white">Text to 3D Model</div>
                      <div className="text-xs text-slate-400">
                        Turn natural language prompts into textured 3D meshes
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/features/image-to-3d-model"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <ImageIcon className="mt-0.5 h-5 w-5 text-sky-400" />
                    <div>
                      <div className="font-semibold text-white">Image to 3D Model</div>
                      <div className="text-xs text-slate-400">
                        Single or Multi-View photos to production 3D assets
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/features/ai-texturing"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Wand2 className="mt-0.5 h-5 w-5 text-purple-400" />
                    <div>
                      <div className="font-semibold text-white">AI Texturing & 8K PBR</div>
                      <div className="text-xs text-slate-400">
                        Ultra 8K PBR materials, Magic Brush & De-lighting
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/features/smart-retopology"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Layers className="mt-0.5 h-5 w-5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-white">Smart Mesh & Segmentation</div>
                      <div className="text-xs text-slate-400">
                        P1.0/P2.0 clean Quad topology & semantic part splitting
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/features/3d-rigging-animation"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Bone className="mt-0.5 h-5 w-5 text-rose-400" />
                    <div>
                      <div className="font-semibold text-white">Auto Rigging & Animation</div>
                      <div className="text-xs text-slate-400">
                        One-click humanoid biped skeleton & motion library
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            {/* 3D Tools Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setToolsOpen(true)}
              onMouseLeave={() => setToolsOpen(false)}
            >
              <button
                type="button"
                onClick={() => setToolsOpen((v) => !v)}
                className="flex items-center gap-1 py-2 text-slate-300 hover:text-white transition"
              >
                3D Tools <ChevronDown className="h-4 w-4 opacity-70" />
              </button>
              {toolsOpen && (
                <div className="absolute left-0 top-full w-72 rounded-2xl border border-white/10 bg-[#121318] p-3 shadow-2xl">
                  <Link
                    href="/3d-tools/convert"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Box className="mt-0.5 h-5 w-5 text-[#f5c518]" />
                    <div>
                      <div className="font-semibold text-white">Free 3D File Converter</div>
                      <div className="text-xs text-slate-400">
                        Convert GLB, OBJ, STL, PLY, FBX directly in browser
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/3d-tools/3d-viewer"
                    className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-white/5"
                  >
                    <Cpu className="mt-0.5 h-5 w-5 text-sky-400" />
                    <div>
                      <div className="font-semibold text-white">Online 3D Viewer</div>
                      <div className="text-xs text-slate-400">
                        Inspect topology, PBR channels, UV unwrap & rig bones
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/pricing" className="hover:text-white transition">
              Pricing
            </Link>
            <Link href="/platform" className="hover:text-white transition">
              API Platform
            </Link>
            <Link href="/research" className="hover:text-white transition">
              Research
            </Link>
            <Link href="/studio" className="hover:text-white transition">
              Community
            </Link>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition"
          >
            Redeem Invite
          </Link>
          <Link
            href="/workspace/generate"
            className="flex items-center gap-1.5 rounded-full bg-[#f5c518] px-5 py-2 text-sm font-bold text-black shadow-lg shadow-[#f5c518]/20 hover:bg-[#fde047] transition"
          >
            App <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen((m) => !m)}
          className="md:hidden rounded-lg p-2 text-slate-300 hover:bg-white/10"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0d0e12] px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Link href="/workspace/generate" className="rounded-lg bg-white/5 p-2.5 text-white font-medium">
              3D Workspace
            </Link>
            <Link href="/studio" className="rounded-lg bg-white/5 p-2.5 text-white font-medium">
              Studio Home
            </Link>
            <Link href="/3d-tools/convert" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              3D Converter
            </Link>
            <Link href="/3d-tools/3d-viewer" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              3D Viewer
            </Link>
            <Link href="/pricing" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              Pricing
            </Link>
            <Link href="/platform" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              API Platform
            </Link>
            <Link href="/research" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              Research
            </Link>
            <Link href="/login" className="rounded-lg bg-white/5 p-2.5 text-slate-300">
              Sign In / Invite
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#050507] py-14 text-sm text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 border border-white/15">
                <svg viewBox="0 0 40 40" className="h-4 w-4">
                  <path
                    d="M7 9 H33 L20 33 Z"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                  <path d="M20 9 L33 9 L26.5 21 Z" fill="#f5c518" />
                </svg>
              </div>
              <span className="font-extrabold tracking-wider text-white">
                TRIPO AI
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Next-generation 3D foundation models (Tripo H3.1 & Smart Mesh P2.0) for game studios, VFX, and industrial design.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">AI 3D Features</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/features/text-to-3d-model" className="hover:text-white">Text to 3D Model</Link></li>
              <li><Link href="/features/image-to-3d-model" className="hover:text-white">Image to 3D Model</Link></li>
              <li><Link href="/features/ai-texturing" className="hover:text-white">AI Texturing & 8K PBR</Link></li>
              <li><Link href="/features/smart-retopology" className="hover:text-white">Smart Mesh & Retopo</Link></li>
              <li><Link href="/features/3d-rigging-animation" className="hover:text-white">3D Rigging & Animation</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Free 3D Tools</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/3d-tools/convert" className="hover:text-white">3D Format Converter</Link></li>
              <li><Link href="/3d-tools/3d-viewer" className="hover:text-white">Online 3D Viewer</Link></li>
              <li><Link href="/3d-tools/convert?pair=glb-to-obj" className="hover:text-white">GLB to OBJ Converter</Link></li>
              <li><Link href="/3d-tools/convert?pair=obj-to-glb" className="hover:text-white">OBJ to GLB Converter</Link></li>
              <li><Link href="/3d-tools/convert?pair=glb-to-stl" className="hover:text-white">GLB to STL Converter</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Products</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/studio" className="hover:text-white">Tripo Studio Home</Link></li>
              <li><Link href="/workspace/generate" className="hover:text-white">3D Workspace IDE</Link></li>
              <li><Link href="/platform" className="hover:text-white">API Platform (v3)</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Studio Pricing</Link></li>
              <li><Link href="/research" className="hover:text-white">Tripo Research</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-white">Governance</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white">Account Sign In</Link></li>
              <li><Link href="/register" className="hover:text-white">Invite-Only Registration</Link></li>
              <li><Link href="/admin" className="hover:text-white">Admin & Audit Console</Link></li>
              <li><Link href="/creator-hub" className="hover:text-white">Creator Hub</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Tripo AI Studio. Production Replica with Invite-Only RBAC.</p>
          <div className="mt-2 flex gap-4 sm:mt-0">
            <span>Tripo H3.1 & P2.0 Engine</span>
            <span>•</span>
            <span>glTF 2.0 / OBJ / STL / PLY</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
