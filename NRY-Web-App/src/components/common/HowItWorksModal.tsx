"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  Search,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Sparkles,
  Landmark,
  ArrowRight,
  ShoppingBag,
  Store,
  Layers
} from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"all" | "buyer" | "seller">("all");

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-br from-[#113D60] via-[#0f1d38] to-[#070e1a] text-white rounded-3xl border border-cyan-500/30 shadow-[0_25px_60px_-15px_rgba(0,180,216,0.35)] max-w-4xl w-full p-5 sm:p-8 space-y-6 relative overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4 relative z-10 shrink-0">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-semibold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5 text-cyan-300" />
              <span>Seamless Commercial Experience</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              How Noryvanta Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              A transparent, safe, and modern workflow engineered for Indian commerce.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow View Mode Filter (All, Buyer, Seller) */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.06] rounded-xl border border-white/10 w-fit shrink-0 relative z-10">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            Complete Workflow
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("buyer")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "buyer"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>For Buyers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seller")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "seller"
                ? "bg-cyan-500 text-slate-950 shadow-sm"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>For Sellers</span>
          </button>
        </div>

        {/* Scrollable Workflow Content */}
        <div className="overflow-y-auto pr-1 space-y-6 relative z-10">
          <div
            className={`grid gap-5 ${
              activeTab === "all" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {/* Column 1: For Buyers & Customers */}
            {(activeTab === "all" || activeTab === "buyer") && (
              <div className="p-5 sm:p-6 rounded-2xl border border-cyan-500/25 bg-white/[0.04] backdrop-blur-xs space-y-5 hover:border-cyan-400/50 transition">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center font-semibold text-sm shadow-md">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
                      <span>For Buyers &amp; Customers</span>
                    </h3>
                    <p className="text-xs text-cyan-300 font-medium">
                      Procure from verified suppliers with zero fraud
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-bold text-sm">
                        Search &amp; Discover
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Find products, commercial services, and local verified stores with authentic imagery, pricing, and technical specifications.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-bold text-sm">
                        Direct Contact or Instant Order
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Send custom RFQ enquiries or purchase instantly with 100% institutional RBI-compliant escrow payment protection.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-bold text-sm">
                        Quality Inspection Window
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Your payment remains safe in sovereign escrow until shipment delivery and inspection verification are satisfied.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/products"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Explore Products &amp; Services</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* Column 2: For Businesses & Sellers */}
            {(activeTab === "all" || activeTab === "seller") && (
              <div className="p-5 sm:p-6 rounded-2xl border border-emerald-500/25 bg-white/[0.04] backdrop-blur-xs space-y-5 hover:border-emerald-400/50 transition">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-semibold text-sm shadow-md">
                    2
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white flex items-center gap-1.5">
                      <span>For Businesses &amp; Sellers</span>
                    </h3>
                    <p className="text-xs text-emerald-300 font-medium">
                      Grow sales, automate listings, and get paid safely
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs text-slate-300">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold text-sm">
                        Multi-Step Registration
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Create a verified business profile with interactive map location pinning, optional GST registration, and bank verification.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold text-sm">
                        6+ Images &amp; AI Listing
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Upload at least 6 high-res photos and instantly generate professional, SEO-optimized listing descriptions with built-in AI.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                      <Landmark className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <strong className="text-white block font-semibold text-sm">
                        Guaranteed Settlements
                      </strong>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        Receive direct bank payouts via T+2 settlement upon verified delivery, with transparent category platform fee deductions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Link
                    href="/register"
                    onClick={onClose}
                    className="w-full py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Register Your Business</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Trust Guarantees Bar */}
          <div className="p-3.5 bg-white/[0.05] rounded-2xl border border-white/10 flex flex-wrap items-center justify-around gap-3 text-[11px] font-medium text-slate-300">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              100% Escrow Protection
            </span>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              GST Verified Businesses
            </span>
            <span className="flex items-center gap-1.5 text-slate-200">
              <Landmark className="w-3.5 h-3.5 text-cyan-400" />
              T+2 Direct Bank Payouts
            </span>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-white/10 relative z-10 shrink-0">
          <Link
            href="/register"
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white hover:bg-slate-100 text-[#113D60] text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
          >
            <Building2 className="w-4 h-4 text-cyan-600" />
            <span>Get Started with Noryvanta</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-6 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-medium rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
