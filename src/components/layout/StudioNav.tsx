'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  Zap,
  Gift,
  Bell,
  Shield,
  LogOut,
  Check,
  Sparkles,
  Box,
  Grid,
  Image as ImageIcon,
  Download,
  X,
} from 'lucide-react';

export interface ViewerUser {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'CREATOR' | 'VIEWER';
  status: string;
  planTier: string;
  creditsBalance: number;
  smartMeshTrials: number;
  onboardingCompleted: boolean;
  primaryUseCase: string | null;
  subCategory: string | null;
}

const DCC_PLUGINS = [
  { name: 'Blender', version: 'v1.0.3', badge: 'Bridge', tag: 'Popular' },
  { name: '3ds Max', version: 'v1.0.2', badge: 'Bridge' },
  { name: 'Unity', version: 'v1.0.1', badge: 'SDK' },
  { name: 'Unreal', version: 'v1.0.4', badge: 'Bridge', tag: 'UE 5.4+' },
  { name: 'Maya', version: 'v1.0.2', badge: 'Bridge' },
  { name: 'Cocos', version: 'v1.0.0', badge: 'Plugin' },
  { name: 'Godot', version: 'v1.0.0', badge: 'Addon' },
  { name: 'ZBrush', version: 'v1.0.2', badge: 'GoZ' },
  { name: 'MetaTailor', version: 'v1.0.0', badge: 'Bridge' },
  { name: 'Roblox', version: 'v1.0.0', badge: 'Studio' },
  { name: 'SketchUp', version: 'v1.0.0', badge: 'Extension' },
];

const ONBOARDING_CATEGORIES = [
  {
    id: 'Game Assets',
    label: 'Game Assets',
    subs: ['Character', 'Weapon & Props', 'Environment', 'Vehicle', 'Stylized / Low-Poly'],
  },
  {
    id: '3D Printing',
    label: '3D Printing',
    subs: ['Miniature Figurine', 'Functional Part', 'Tabletop Terrain', 'Cosplay Prop'],
  },
  {
    id: 'Film & Animation',
    label: 'Film & Animation',
    subs: ['Hero Creature', 'VFX Set Extension', 'Previz Asset', 'Motion Capture Rig'],
  },
  {
    id: 'Product Design',
    label: 'Product Design',
    subs: ['Consumer Electronics', 'Footwear & Apparel', 'Packaging Prototype', 'Toy Design'],
  },
  {
    id: 'Architecture & Interior',
    label: 'Architecture & Interior',
    subs: ['Furniture & Decor', 'Building Massing', 'Landscape Props'],
  },
  {
    id: 'AR / VR / XR',
    label: 'AR / VR / XR',
    subs: ['Spatial Computing Prop', 'Avatar Accessory', 'WebXR Commerce'],
  },
  {
    id: 'Education & Research',
    label: 'Education & Research',
    subs: ['Scientific Visualization', 'Historical Artifact', 'Robotics Simulation'],
  },
  {
    id: 'Just Exploring',
    label: 'Just Exploring',
    subs: ['AI Art & Hobby', 'Social Media 3D', 'Testing Pipeline'],
  },
];

interface StudioNavProps {
  user?: ViewerUser | null;
  onUserUpdated?: (user: ViewerUser | null) => void;
  onSelectWorkspaceMode?: (mode: 'HD_MODEL' | 'SMART_MESH' | 'IMAGE_GEN') => void;
}

export function StudioNavbar({
  user: propUser,
  onUserUpdated,
  onSelectWorkspaceMode,
}: StudioNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<ViewerUser | null>(propUser ?? null);
  const [workspaceDropdown, setWorkspaceDropdown] = useState(false);
  const [resourcesDropdown, setResourcesDropdown] = useState(false);
  const [dccOpen, setDccOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Pricing Modal State
  const [billingCycle, setBillingCycle] = useState<'annually' | 'monthly'>('annually');
  const [planScope, setPlanScope] = useState<'individual' | 'team'>('individual');
  const [redeemCode, setRedeemCode] = useState('');
  const [pricingStatus, setPricingStatus] = useState<string | null>(null);
  const [installedDcc, setInstalledDcc] = useState<string | null>(null);

  // Onboarding Modal State
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [selectedPrimary, setSelectedPrimary] = useState<string>('Game Assets');
  const [selectedSub, setSelectedSub] = useState<string>('Character');

  useEffect(() => {
    if (propUser) {
      setUser(propUser);
      if (!propUser.onboardingCompleted) {
        setOnboardingOpen(true);
      }
      return;
    }
    let cancelled = false;
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.authenticated && d.user) {
          setUser(d.user);
          onUserUpdated?.(d.user);
          if (!d.user.onboardingCompleted) {
            setOnboardingOpen(true);
          }
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [propUser, onUserUpdated]);

  const handlePlanUpgrade = async (tier: 'FREE' | 'PRO' | 'MAX') => {
    if (!user) {
      router.push('/login');
      return;
    }
    setPricingStatus(`Switching plan to ${tier}...`);
    const res = await fetch('/api/studio/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planTier: tier }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      const updated = { ...user, ...data.user };
      setUser(updated);
      onUserUpdated?.(updated);
      setPricingStatus(`Successfully activated ${tier} plan! Credits updated to ${updated.creditsBalance} ⚡`);
    } else {
      setPricingStatus(data.error || 'Failed to update plan');
    }
  };

  const handleCompleteOnboarding = async () => {
    if (!user) {
      setOnboardingOpen(false);
      return;
    }
    const res = await fetch('/api/studio/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primaryUseCase: selectedPrimary,
        subCategory: selectedSub,
      }),
    });
    const data = await res.json();
    if (res.ok && data.user) {
      const updated = { ...user, ...data.user };
      setUser(updated);
      onUserUpdated?.(updated);
    }
    setOnboardingOpen(false);
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    onUserUpdated?.(null);
    router.push('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#0d0e12] px-4 select-none">
        {/* Left: Logo + Navigation */}
        <div className="flex items-center gap-5">
          <Link href="/studio" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/5 border border-white/10">
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
            <div className="flex items-baseline gap-1">
              <span className="text-base font-extrabold tracking-wider text-white">
                TRIPO
              </span>
              <span className="text-xs font-semibold tracking-widest text-slate-400">
                STUDIO
              </span>
            </div>
          </Link>

          {/* 3D Workspace Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceDropdown((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-[#f5c518] px-3.5 py-1.5 text-xs font-bold text-black shadow-md shadow-[#f5c518]/20 hover:bg-[#fde047] transition"
            >
              <span>3D Workspace</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {workspaceDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-white/15 bg-[#161820] p-2 shadow-2xl z-50">
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceDropdown(false);
                    if (onSelectWorkspaceMode) onSelectWorkspaceMode('HD_MODEL');
                    else router.push('/workspace/generate?mode=HD_MODEL');
                  }}
                  className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-white/10 transition"
                >
                  <Box className="mt-0.5 h-5 w-5 text-[#f5c518]" />
                  <div>
                    <div className="text-xs font-bold text-white">High Detail Model</div>
                    <div className="text-[11px] text-slate-400">
                      Rich geometry & 8K PBR textures (Tripo H3.1)
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceDropdown(false);
                    if (onSelectWorkspaceMode) onSelectWorkspaceMode('SMART_MESH');
                    else router.push('/workspace/generate?mode=SMART_MESH');
                  }}
                  className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-white/10 transition"
                >
                  <Grid className="mt-0.5 h-5 w-5 text-sky-400" />
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>Smart Topology Mesh</span>
                      <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f5c518]">
                        P2.0 NEW
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Production-ready game-ready quad flow
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWorkspaceDropdown(false);
                    if (onSelectWorkspaceMode) onSelectWorkspaceMode('IMAGE_GEN');
                    else router.push('/workspace/generate?stage=image');
                  }}
                  className="flex w-full items-start gap-3 rounded-xl p-2.5 text-left hover:bg-white/10 transition"
                >
                  <ImageIcon className="mt-0.5 h-5 w-5 text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-white">Generate Image</div>
                    <div className="text-[11px] text-slate-400">
                      Synthesize multi-view or studio reference images
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <nav className="hidden lg:flex items-center gap-5 text-xs font-medium">
            <Link
              href="/studio"
              className={`transition ${
                pathname === '/studio' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Home
            </Link>
            <Link
              href="/assets"
              className={`transition ${
                pathname === '/assets' ? 'text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Assets
            </Link>
            <Link
              href="/creator-hub"
              className={`transition ${
                pathname === '/creator-hub'
                  ? 'text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Creator Hub
            </Link>

            {/* Resources Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setResourcesDropdown((v) => !v)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                Resources <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {resourcesDropdown && (
                <div className="absolute left-0 top-full mt-2 w-56 rounded-xl border border-white/10 bg-[#161820] p-2 shadow-2xl z-50">
                  <Link
                    href="/platform"
                    onClick={() => setResourcesDropdown(false)}
                    className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Developer API Platform (v3)
                  </Link>
                  <Link
                    href="/3d-tools/convert"
                    onClick={() => setResourcesDropdown(false)}
                    className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Free 3D File Converter
                  </Link>
                  <Link
                    href="/3d-tools/3d-viewer"
                    onClick={() => setResourcesDropdown(false)}
                    className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Interactive 3D Viewer
                  </Link>
                  <Link
                    href="/research"
                    onClick={() => setResourcesDropdown(false)}
                    className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Tripo H3.1 & P2.0 Research
                  </Link>
                  <Link
                    href="/"
                    onClick={() => setResourcesDropdown(false)}
                    className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                  >
                    Marketing Homepage
                  </Link>
                </div>
              )}
            </div>

            {/* DCC Bridge Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDccOpen((v) => !v)}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition"
              >
                DCC Bridge <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {dccOpen && (
                <div className="absolute left-0 top-full mt-2 w-80 rounded-2xl border border-white/15 bg-[#161820] p-3 shadow-2xl z-50">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-white">
                      DCC Bridge Plugins (11 Official)
                    </span>
                    <button
                      onClick={() => setDccOpen(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                    {DCC_PLUGINS.map((plugin) => (
                      <div
                        key={plugin.name}
                        className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 hover:border-white/15"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <span>{plugin.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {plugin.version}
                            </span>
                            {plugin.tag && (
                              <span className="rounded bg-[#f5c518]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f5c518]">
                                {plugin.tag}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            One-click send mesh & PBR textures to {plugin.name}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInstalledDcc(`${plugin.name} ${plugin.version}`)}
                          className="flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#f5c518] hover:text-black transition"
                        >
                          <Download className="h-3 w-3" />
                          {plugin.badge}
                        </button>
                      </div>
                    ))}
                  </div>
                  {installedDcc && (
                    <div className="mt-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1.5 text-[11px] text-emerald-300">
                      ✓ Downloaded {installedDcc} installer package
                    </div>
                  )}
                </div>
              )}
            </div>

            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={`flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-[#f5c518] hover:bg-amber-500/20 ${
                  pathname === '/admin' ? 'ring-1 ring-[#f5c518]' : ''
                }`}
              >
                <Shield className="h-3 w-3" />
                Admin Console
              </Link>
            )}
          </nav>
        </div>

        {/* Right: Credits Pill + Upgrade + Gift + Notifications + User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Credits + Upgrade Pill */}
          <div className="flex items-center rounded-full border border-white/10 bg-[#181a22] p-0.5 pl-3">
            <div className="flex items-center gap-1 pr-2.5 text-xs font-bold text-white">
              <Zap className="h-3.5 w-3.5 fill-[#f5c518] text-[#f5c518]" />
              <span data-testid="credits-balance">
                {user ? user.creditsBalance.toLocaleString() : '200'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPricingOpen(true)}
              className="rounded-full bg-gradient-to-r from-[#fef08a] to-[#f5c518] px-3 py-1 text-[11px] font-extrabold text-black hover:brightness-105 transition"
            >
              Upgrade
            </button>
          </div>

          {/* Gift / Invite Reward Button */}
          <button
            type="button"
            onClick={() => setGiftOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#181a22] text-slate-300 hover:text-[#f5c518] transition"
            title="Referral & Redeem Rewards"
          >
            <Gift className="h-4 w-4" />
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#181a22] text-slate-300 hover:text-white transition"
              title="Task & System Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/15 bg-[#161820] p-3 shadow-2xl z-50">
                <div className="mb-2 flex items-center justify-between text-xs font-bold text-white">
                  <span>Notifications</span>
                  <span className="text-[10px] text-emerald-400">All Caught Up</span>
                </div>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="rounded-xl bg-white/5 p-2.5">
                    <div className="font-semibold text-white">Tripo H3.1 & Smart Mesh P2.0 Live</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      Enjoy 2 free daily Smart Mesh P2.0 trials (save 100 ⚡ per generation).
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar + Lv.0 Badge */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-[#181a22] py-1 pl-1.5 pr-2.5 hover:border-white/25 transition"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                  Lv.0
                </span>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-[#161820] p-3 shadow-2xl z-50">
                  <div className="border-b border-white/10 pb-2.5">
                    <div className="truncate text-xs font-bold text-white">
                      {user.name || user.email}
                    </div>
                    <div className="truncate text-[11px] text-slate-400">{user.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="rounded bg-[#f5c518]/20 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                        {user.planTier} PLAN
                      </span>
                      <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                        ROLE: {user.role}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <Link
                      href="/assets"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-white/10"
                    >
                      My 3D Assets
                    </Link>
                    <Link
                      href="/platform"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded-lg px-2.5 py-1.5 text-slate-200 hover:bg-white/10"
                    >
                      API Keys & OpenAPI v3
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setOnboardingOpen(true);
                      }}
                      className="w-full rounded-lg px-2.5 py-1.5 text-left text-slate-200 hover:bg-white/10"
                    >
                      Workflow Preferences ({user.primaryUseCase || 'Game Assets'})
                    </button>
                    {user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        onClick={() => setUserMenuOpen(false)}
                        className="block rounded-lg px-2.5 py-1.5 font-semibold text-[#f5c518] hover:bg-white/10"
                      >
                        Admin Governance & Invites
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-[#f5c518] hover:bg-white/15"
              >
                Redeem Invite
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Tripo Studio Pricing Modal (Exact match to Studio upgrade modal) */}
      {pricingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/15 bg-[#12141c] p-6 sm:p-8 shadow-2xl">
            <button
              type="button"
              onClick={() => setPricingOpen(false)}
              className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-slate-300 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-extrabold text-white">Tripo Studio Pricing</h2>
              <p className="mt-1 text-xs text-slate-400">
                Scale your 3D production pipeline with Tripo H3.1 Ultra and Smart Mesh P2.0
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <div className="inline-flex rounded-full border border-white/10 bg-[#0b0c10] p-1">
                  <button
                    type="button"
                    onClick={() => setPlanScope('individual')}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      planScope === 'individual'
                        ? 'bg-white text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanScope('team')}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      planScope === 'team'
                        ? 'bg-white text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Team
                  </button>
                </div>

                <div className="inline-flex rounded-full border border-white/10 bg-[#0b0c10] p-1">
                  <button
                    type="button"
                    onClick={() => setBillingCycle('monthly')}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      billingCycle === 'monthly'
                        ? 'bg-[#f5c518] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Pay Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle('annually')}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-semibold ${
                      billingCycle === 'annually'
                        ? 'bg-[#f5c518] text-black'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Pay Annually</span>
                    <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px] font-bold">
                      50% OFF
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {pricingStatus && (
              <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-center text-xs font-semibold text-emerald-300">
                {pricingStatus}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
              {/* FREE PLAN */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#181a24] p-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Free</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">$0</span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    For creators exploring AI 3D generation
                  </p>
                  <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> 300 monthly credits (⚡)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> 2 daily Smart Mesh P2.0 trials
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> 1 concurrent generation task
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> Public CC-BY 4.0 license
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlanUpgrade('FREE')}
                  className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  {user?.planTier === 'FREE' ? 'Current Plan' : 'Switch to Free'}
                </button>
              </div>

              {/* PRO PLAN */}
              <div className="relative flex flex-col justify-between rounded-2xl border-2 border-[#f5c518] bg-[#1b1e2b] p-6 shadow-xl shadow-[#f5c518]/10">
                <span className="absolute -top-3 right-5 rounded-full bg-[#f5c518] px-3 py-0.5 text-[10px] font-extrabold text-black">
                  MOST POPULAR
                </span>
                <div>
                  <h3 className="text-lg font-bold text-white">Professional</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-[#f5c518]">
                      ${billingCycle === 'annually' ? '13' : '19.9'}
                    </span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    For indie game developers & 3D artists
                  </p>
                  <ul className="mt-5 space-y-2.5 text-xs text-slate-200">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#f5c518]" /> 3,000 monthly credits (⚡)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#f5c518]" /> 10 concurrent tasks in queue
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#f5c518]" /> Private assets & commercial rights
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#f5c518]" /> 4K & 8K Ultra PBR Texture Generator
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[#f5c518]" /> Full Smart Mesh P2.0 & Segmentation
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlanUpgrade('PRO')}
                  className="mt-6 w-full rounded-xl bg-[#f5c518] py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
                >
                  {user?.planTier === 'PRO' ? 'Current Plan (Re-top 3,000 ⚡)' : 'Subscribe to Pro'}
                </button>
              </div>

              {/* MAX PLAN */}
              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#181a24] p-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Studio Max</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">
                      ${billingCycle === 'annually' ? '45' : '139.9'}
                    </span>
                    <span className="text-xs text-slate-400">/month</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    For production studios & high-throughput pipelines
                  </p>
                  <ul className="mt-5 space-y-2.5 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> 12,000 monthly credits (⚡)
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> 20 concurrent generation tasks
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> Unlimited post-processing & rigging
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" /> Priority GPU cluster scheduling
                    </li>
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handlePlanUpgrade('MAX')}
                  className="mt-6 w-full rounded-xl border border-[#f5c518]/50 bg-[#f5c518]/10 py-2.5 text-xs font-bold text-[#f5c518] hover:bg-[#f5c518] hover:text-black transition"
                >
                  {user?.planTier === 'MAX' ? 'Current Plan (Re-top 12,000 ⚡)' : 'Subscribe to Max'}
                </button>
              </div>
            </div>

            {/* Redeem Code Footer inside Pricing Modal */}
            <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b0c10] p-4 sm:flex-row">
              <div className="text-xs text-slate-300">
                <span className="font-bold text-white">Have a Studio Promo / Credit Voucher?</span>{' '}
                Redeem bonus credits directly into your workspace wallet.
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value)}
                  placeholder="Enter voucher code (e.g. TRIPO500)"
                  className="w-full sm:w-52 rounded-lg border border-white/15 bg-[#161820] px-3 py-1.5 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (redeemCode.trim()) {
                      handlePlanUpgrade('PRO');
                      setRedeemCode('');
                    }
                  }}
                  className="rounded-lg bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
                >
                  Redeem Code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gift / Invite Friends Modal */}
      {giftOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#161820] p-6 shadow-2xl">
            <button
              onClick={() => setGiftOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 text-[#f5c518]">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Creator Referral & Admission
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-white">
              Invite Collaborators to Tripo Studio
            </h3>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              This instance enforces strict invite-only account admission with single-use expiring codes and full RBAC audit logging.
            </p>
            <div className="mt-4 rounded-xl border border-white/10 bg-[#0d0e12] p-3 text-xs text-slate-300">
              {user?.role === 'ADMIN' ? (
                <div>
                  <p className="font-semibold text-emerald-400">
                    You have Admin privileges!
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Generate single-use invitation codes for Creators, Viewers, or Admins in the Admin Governance Console.
                  </p>
                  <Link
                    href="/admin"
                    onClick={() => setGiftOpen(false)}
                    className="mt-3 inline-block rounded-lg bg-[#f5c518] px-4 py-1.5 text-xs font-bold text-black"
                  >
                    Open Admin Invite Console
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-white">Need an invitation code for a teammate?</p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Request a single-use invitation code from your workspace Administrator.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2-Step Onboarding Modal ("How do you create with Tripo?") */}
      {onboardingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-2xl rounded-3xl border border-white/15 bg-[#12141d] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#f5c518]/15 px-3 py-1 text-[11px] font-bold text-[#f5c518]">
                Step {onboardingStep} of 2 • Studio Personalization
              </span>
              <button
                type="button"
                onClick={() => setOnboardingOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Skip for now
              </button>
            </div>

            {onboardingStep === 1 ? (
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-white">
                  How do you create with Tripo?
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Select your primary 3D creation workflow so we can tailor your default topology and PBR presets.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ONBOARDING_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedPrimary(cat.id);
                        setSelectedSub(cat.subs[0]);
                      }}
                      className={`flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${
                        selectedPrimary === cat.id
                          ? 'border-[#f5c518] bg-[#f5c518]/15 text-white shadow-lg shadow-[#f5c518]/10'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <Box
                        className={`mb-2 h-6 w-6 ${
                          selectedPrimary === cat.id ? 'text-[#f5c518]' : 'text-slate-400'
                        }`}
                      />
                      <span className="text-xs font-bold">{cat.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(2)}
                    className="rounded-full bg-[#f5c518] px-6 py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
                  >
                    Next: Choose Sub-Specialty →
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <h2 className="text-2xl font-extrabold text-white">
                  Which {selectedPrimary} focus fits best?
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  We will configure your Studio workspace presets for {selectedPrimary}.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {(
                    ONBOARDING_CATEGORIES.find((c) => c.id === selectedPrimary)?.subs || [
                      'Character',
                    ]
                  ).map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setSelectedSub(sub)}
                      className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                        selectedSub === sub
                          ? 'border-[#f5c518] bg-[#f5c518] text-black'
                          : 'border-white/15 bg-white/5 text-slate-300 hover:border-white/30'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(1)}
                    className="rounded-full border border-white/15 px-5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/5"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    className="rounded-full bg-[#f5c518] px-6 py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047]"
                  >
                    Enter Tripo Studio
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
