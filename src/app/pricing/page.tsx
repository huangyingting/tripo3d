'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MarketingNavbar, MarketingFooter } from '@/components/layout/MarketingNav';
import { Check, Zap, ArrowRight } from 'lucide-react';

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col">
      <MarketingNavbar />

      <main className="mx-auto flex-1 max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white">
            Simple, Transparent 3D Studio Pricing
          </h1>
          <p className="text-sm text-slate-400">
            Start for free with 300 monthly credits and 2 daily Smart Mesh P2.0 trials, or scale up to 12,000 credits/month for studio production.
          </p>

          <div className="inline-flex rounded-full border border-white/10 bg-[#12141c] p-1">
            <button
              type="button"
              onClick={() => setAnnual(false)}
              className={`rounded-full px-5 py-2 text-xs font-bold ${
                !annual ? 'bg-[#f5c518] text-black' : 'text-slate-400'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 rounded-full px-5 py-2 text-xs font-bold ${
                annual ? 'bg-[#f5c518] text-black' : 'text-slate-400'
              }`}
            >
              <span>Annual Billing</span>
              <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
                Save 50%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              name: 'Basic (Free)',
              price: '$0',
              credits: '300 ⚡ / month',
              features: [
                '300 monthly studio credits',
                '2 free Smart Mesh P2.0 trials/day',
                '1 concurrent generation task',
                'GLB, OBJ, STL, PLY exports',
                'CC-BY 4.0 public assets',
              ],
              cta: 'Start Free in Studio',
              highlight: false,
            },
            {
              name: 'Professional',
              price: annual ? '$13' : '$19.9',
              credits: '3,000 ⚡ / month',
              features: [
                '3,000 monthly studio credits',
                '10 concurrent tasks in queue',
                'Private commercial license',
                '4K & 8K Ultra PBR textures',
                'AI Segmentation & Auto Rigging',
              ],
              cta: 'Upgrade in Studio',
              highlight: true,
            },
            {
              name: 'Studio Max',
              price: annual ? '$45' : '$139.9',
              credits: '12,000 ⚡ / month',
              features: [
                '12,000 monthly studio credits',
                '20 concurrent generation tasks',
                'Unlimited Smart UV & Retopology',
                'Dedicated GPU priority queue',
                'Full DCC Bridge & API v3 access',
              ],
              cta: 'Go Studio Max',
              highlight: false,
            },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col justify-between rounded-3xl border p-8 ${
                tier.highlight
                  ? 'border-2 border-[#f5c518] bg-[#161926] shadow-2xl shadow-[#f5c518]/10'
                  : 'border-white/10 bg-[#11131b]'
              }`}
            >
              <div>
                <h2 className="text-xl font-extrabold text-white">{tier.name}</h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#f5c518]/15 px-3 py-1 text-xs font-bold text-[#f5c518]">
                  <Zap className="h-3.5 w-3.5" /> {tier.credits}
                </div>
                <ul className="mt-6 space-y-3 text-xs text-slate-300">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5">
                      <Check className="h-4 w-4 text-[#f5c518]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href="/workspace/generate"
                className={`mt-8 flex items-center justify-center gap-2 rounded-full py-3 text-xs font-extrabold transition ${
                  tier.highlight
                    ? 'bg-[#f5c518] text-black hover:bg-[#fde047]'
                    : 'border border-white/15 bg-white/5 text-white hover:bg-white/10'
                }`}
              >
                <span>{tier.cta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
