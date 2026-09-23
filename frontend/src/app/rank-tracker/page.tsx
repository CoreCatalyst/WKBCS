"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  Award, ShieldCheck, CheckCircle2, ChevronRight, Lock,
  TrendingUp, Clock, AlertCircle, Info, Sparkles, Layers,
  ExternalLink, ArrowUpRight, Check, Zap, HelpCircle
} from "lucide-react";

interface RankTier {
  name: string;
  min_sales_inr: number;
  platform_fee_percent: number;
  badge: string;
  benefits: string[];
}

export default function RankTrackerPage() {
  const [tiers, setTiers] = useState<RankTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState("Cycle 1");
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    async function fetchRanks() {
      try {
        const res = await api.get("/admin/ranks");
        if (res.data?.tiers) {
          setTiers(res.data.tiers);
        }
      } catch {
        // Fallback default tiers
        setTiers([
          {
            name: "Standard Vendor",
            min_sales_inr: 0,
            platform_fee_percent: 4.5,
            badge: "STANDARD",
            benefits: ["Basic catalog listing", "Standard 48h escrow settlement"]
          },
          {
            name: "Silver Verified",
            min_sales_inr: 500000,
            platform_fee_percent: 3.8,
            badge: "SILVER",
            benefits: ["Verified Supplier badge", "Priority RFQ matching", "36h escrow settlement"]
          },
          {
            name: "Gold Strategic",
            min_sales_inr: 2500000,
            platform_fee_percent: 3.0,
            badge: "GOLD",
            benefits: ["Gold badge", "AI listing boost", "24h instant escrow settlement", "Dedicated account manager"]
          },
          {
            name: "Sovereign Platinum",
            min_sales_inr: 10000000,
            platform_fee_percent: 2.2,
            badge: "SOVEREIGN_PLATINUM",
            benefits: ["Sovereign Crown mark", "Lowest take-rate (2.2%)", "Instant T+0 escrow release", "Custom credit line"]
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchRanks();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  Sovereign Vendor Progression
                </span>
                <span className="text-xs text-slate-500 font-mono">Cycle ID: #CYC-2025-01</span>
              </div>
              <h1 className="text-2xl font-bold font-headline text-[#0F172A]">
                Network Progress — Level & Rank Tracker
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Institutional performance progression, verified escrow volume milestones, and platform fee reduction brackets.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRulesModal(true)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Qualification Terms</span>
              </button>

              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>Vendor Dashboard</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Current Progress Hero Card & Cycle Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 8 cols: Active Rank Card */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-bold">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Active Progression Bracket</span>
                    <h2 className="text-xl font-bold font-headline text-[#0F172A]">
                      CURRENT RANK: GOLD (LEVELS 31–40)
                    </h2>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                  37 / 40 Completed
                </span>
              </div>

              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                You are 3 qualified levels away from Gold Rank Finalization and automatic unlock of Sovereign Platinum Tier (Levels 41–50) with 2.2% platform take-rate.
              </p>

              {/* 10-Segment Detailed Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>L31 (Gold Base)</span>
                  <span className="text-amber-700 font-semibold font-mono">92.5% Segment Completion</span>
                  <span>L40 (Milestone Unlock)</span>
                </div>

                <div className="grid grid-cols-10 gap-1.5 h-3.5 w-full bg-slate-100 p-1 rounded-full border border-slate-200">
                  {/* L31-L36: 6 Confirmed */}
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={`conf-${i}`}
                      className="bg-emerald-600 rounded-full h-full"
                      title={`L${31 + i}: Completed & Approved`}
                    />
                  ))}
                  {/* L37: Reward Processing */}
                  <div
                    className="bg-purple-600 rounded-full h-full animate-pulse"
                    title="L37: Reward Processing (Active)"
                  />
                  {/* L38: Under Verification */}
                  <div
                    className="bg-amber-400 rounded-full h-full"
                    title="L38: Under Verification"
                  />
                  {/* L39: Transaction Received */}
                  <div
                    className="bg-sky-400 rounded-full h-full"
                    title="L39: Transaction Received"
                  />
                  {/* L40: Upcoming */}
                  <div
                    className="bg-slate-200 rounded-full h-full"
                    title="L40: Upcoming Milestone"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-1">
                  <span className="text-emerald-700 font-semibold">● 6 Confirmed</span>
                  <span className="text-purple-700 font-semibold">● 1 Reward Processing (L37)</span>
                  <span className="text-amber-700 font-semibold">● 2 Verification Queue</span>
                  <span className="text-slate-400">● 1 Pending</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Milestone Protocol:</strong> Reaching a level represents milestone qualification progression and does not constitute automated reward entitlement. Settlement clears via verified escrow delivery protocols.
              </p>
            </div>
          </div>

          {/* 4 cols: Cycle Status Card */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cycle Architecture</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                  Active Cycle
                </span>
              </div>

              <h3 className="text-lg font-bold font-headline text-[#0F172A] mb-1">
                CYCLE 1 (CURRENT)
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Levels 1 through 120 operate within standardized 180-day dynamic qualification cycles.
              </p>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-semibold text-slate-800">Cycle 1 Window</span>
                  </div>
                  <span className="font-mono text-slate-500">Jan 15 – Jul 14, 2025</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/50 border border-slate-200/40 opacity-75">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-600">Cycle 2 Scheduled</span>
                  </div>
                  <span className="font-mono text-slate-400">Post L120 Completion</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Audited via Noryvanta Escrow</span>
              <button
                onClick={() => setShowRulesModal(true)}
                className="text-[#1D4ED8] font-semibold hover:underline flex items-center gap-1"
              >
                <span>Rules & Terms</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 Performance KPI Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Escrow Volume Cleared</span>
            <div className="text-xl font-bold font-headline text-[#0F172A] mt-1">₹3,42,80,000</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Target: ₹2.5 Cr (Unlocked)</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">On-Time Fulfillment</span>
            <div className="text-xl font-bold font-headline text-[#0F172A] mt-1">99.4%</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SLA Target: &gt; 98.0%</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Dispute Ratio</span>
            <div className="text-xl font-bold font-headline text-[#0F172A] mt-1">0.01%</div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold mt-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Institutional Excellence</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Active Platform Take-Rate</span>
            <div className="text-xl font-bold font-headline text-[#1E3A8A] mt-1">3.0%</div>
            <div className="flex items-center gap-1 text-[11px] text-blue-700 font-semibold mt-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Drops to 2.2% at Platinum</span>
            </div>
          </div>
        </div>

        {/* Tier Progression Matrix & Benefit Comparison */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold font-headline text-[#0F172A]">
                Sovereign Vendor Tier Structure & Qualification Standards
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Progression tiers, fee reductions, and nodal escrow settlement speed SLAs.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              4 Sovereign Tiers
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Tier Rank</th>
                  <th className="py-3 px-4">Min. Cleared Volume</th>
                  <th className="py-3 px-4">Platform Take-Rate</th>
                  <th className="py-3 px-4">Escrow Settlement SLA</th>
                  <th className="py-3 px-4">Institutional Privileges</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tiers.map((t, idx) => {
                  const isCurrent = t.badge === "GOLD";
                  return (
                    <tr key={idx} className={isCurrent ? "bg-amber-50/50 font-medium" : "hover:bg-slate-50"}>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              t.badge === "SOVEREIGN_PLATINUM"
                                ? "bg-slate-900 text-white"
                                : t.badge === "GOLD"
                                ? "bg-amber-500 text-white"
                                : t.badge === "SILVER"
                                ? "bg-slate-400 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">{t.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] text-amber-700 font-semibold">Your Current Rank</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-slate-800">
                        {t.min_sales_inr === 0 ? "Entry Level (₹0)" : `₹${(t.min_sales_inr / 100000).toFixed(1)} Lakhs`}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-[#1E3A8A]">
                        {t.platform_fee_percent}%
                      </td>
                      <td className="py-4 px-4 text-slate-600">
                        {t.badge === "SOVEREIGN_PLATINUM"
                          ? "Instant T+0 Release"
                          : t.badge === "GOLD"
                          ? "T+1 (24 Hours)"
                          : t.badge === "SILVER"
                          ? "36 Hours"
                          : "48 Hours"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1.5">
                          {t.benefits.map((b, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] border border-slate-200"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold font-headline text-[#0F172A] mb-2">
              Noryvanta Progression & Escrow Qualification Rules
            </h3>
            <div className="space-y-3 text-xs text-slate-600 my-4 leading-relaxed max-h-80 overflow-y-auto pr-2">
              <p>
                <strong>1. Verified Escrow Volume:</strong> Only transactions that have passed final milestone clearance and have been disbursed to the vendor bank account count toward rank volume progression.
              </p>
              <p>
                <strong>2. Cycle Evaluation:</strong> Dynamic 180-day cycles audit overall fulfillment velocity, dispute ratios (&lt; 0.5% required), and GST e-invoicing compliance.
              </p>
              <p>
                <strong>3. Rate Reductions:</strong> Platform commissions automatically adjust upon completing level milestones, taking effect from the very next purchase order.
              </p>
              <p>
                <strong>4. Arbitrated Holds:</strong> Orders subject to active counterparty arbitration are excluded from metric calculations until final tribunal resolution.
              </p>
            </div>
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowRulesModal(false)}
                className="px-4 py-2 bg-[#0F172A] text-white text-xs font-semibold rounded-lg hover:bg-[#1E3A8A] transition"
              >
                Understood & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
