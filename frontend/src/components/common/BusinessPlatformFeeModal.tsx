"use client";

import React from "react";
import Link from "next/link";
import { X, Building2, CheckCircle2, ShieldCheck, ArrowRight, Percent } from "lucide-react";
import { PLATFORM_FEE_SCHEDULE } from "@/lib/platformFeeConfig";

interface BusinessPlatformFeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BusinessPlatformFeeModal: React.FC<BusinessPlatformFeeModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-[#113D60] text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-700/60 relative overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header matching Terms & Conditions */}
        <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 relative z-10 shrink-0">
          <div>
            <h3 className="text-base font-bold text-white">
              Platform Fee Policy Schedule
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Standard commercial category fee schedule charged on successful escrow settlements. Zero customer surcharge.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 transition shrink-0 ml-2"
            aria-label="Close modal"
          >
            Close ✕
          </button>
        </div>

        {/* Scrollable Middle Content with Font same as Terms & Conditions */}
        <div className="text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto space-y-3.5 pr-1 relative z-10">
          {/* 4 Category Platform Fee Cards (No % sign inside card) */}
          <div className="grid grid-cols-2 gap-2.5">
            {PLATFORM_FEE_SCHEDULE.map((tier) => (
              <div
                key={tier.businessType}
                className="p-3 sm:p-3.5 rounded-2xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800/60 hover:border-cyan-500/50 transition-all group"
              >
                <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200 group-hover:text-cyan-300 transition">
                    {tier.label}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                </div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-semibold font-mono text-white group-hover:text-cyan-200 transition">
                    {tier.ratePercentage.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">Category Rate</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                  {tier.description}
                </p>
              </div>
            ))}
          </div>

          {/* Value Proposition Grid */}
          <div className="p-3 bg-slate-900/50 rounded-xl border border-slate-700/60 text-xs grid grid-cols-3 gap-2">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Listing &amp; Setup</span>
              <span className="font-bold text-emerald-400 text-xs mt-0.5 block">100% Free Forever</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Settlement Time</span>
              <span className="font-bold text-cyan-300 text-xs mt-0.5 block">T+2 Direct to Bank</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Customer Surcharge</span>
              <span className="font-bold text-white text-xs mt-0.5 block">Zero Surcharge</span>
            </div>
          </div>

          {/* Policy Text matching Terms & Conditions */}
          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2 text-xs">
            <p>
              <strong className="text-white">1. Business-Side Deductions Only:</strong> The platform fee applies solely to registered merchant disbursements upon successful transaction completion and buyer inspection clearance. It is never added to the customer checkout total.
            </p>
            <p>
              <strong className="text-white">2. Category Invariance:</strong> Fee schedule rates remain fixed according to verified entity registration (Wholesaler: 3.20, Distributor: 5.20, Services: 5.20, Retailer: 8.20).
            </p>
            <p>
              <strong className="text-white">3. Zero Upfront Costs:</strong> Zero catalog listing fees, zero setup fees, and zero recurring maintenance fees.
            </p>
          </div>
        </div>

        {/* Modal Actions Footer matching Terms & Conditions styling */}
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-700/60 relative z-10 shrink-0">
          <Link
            href="/register"
            onClick={onClose}
            className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-center"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Register Your Business</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
