"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Building2,
  Percent,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Globe2,
  HelpCircle,
  FileText
} from "lucide-react";
import { BusinessPlatformFeeModal } from "@/components/common/BusinessPlatformFeeModal";

export const Footer: React.FC = () => {
  const [activePolicy, setActivePolicy] = useState<string | null>(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);

  return (
    <footer className="bg-[#113D60] text-slate-400 border-t border-slate-800 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <Image
                  src="/logo-icon.png"
                  alt="Noryvanta - Global"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-2xl tracking-tight text-white">
                    Noryvanta
                  </span>
                  <span className="font-medium text-lg tracking-tight text-slate-400">
                    - Global
                  </span>
                </div>
                <p className="text-[11px] text-cyan-400 font-medium mt-0.5 tracking-normal">
                  Connect. Grow. Thrive.
                </p>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
              Noryvanta is India&apos;s trusted business marketplace connecting manufacturers, shops, wholesalers, and service providers with sovereign escrow security.
            </p>
          </div>

          {/* Column 1: Marketplace */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>Marketplace</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/products" className="hover:text-cyan-400 transition">
                  Explore Products &amp; Services
                </Link>
              </li>
              <li>
                <Link href="/businesses" className="hover:text-cyan-400 transition">
                  Browse Businesses
                </Link>
              </li>
              <li>
                <Link href="/products?type=Product" className="hover:text-cyan-400 transition">
                  Products Catalog
                </Link>
              </li>
              <li>
                <Link href="/products?type=Service" className="hover:text-cyan-400 transition">
                  Commercial Services
                </Link>
              </li>
              <li>
                <Link href="/businesses" className="hover:text-cyan-400 transition">
                  Industrial &amp; Marketing
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: For Business */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              <span>For Business</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="/register" className="hover:text-cyan-400 transition">
                  Register Your Business
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-cyan-400 transition">
                  Business Login
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-cyan-400 transition">
                  Business Dashboard
                </Link>
              </li>
              <li>
                <Link href="/dashboard?tab=add-listing" className="hover:text-cyan-400 transition">
                  Add Product / Service
                </Link>
              </li>
              <li>
                <Link href="/dashboard?tab=earnings" className="hover:text-cyan-400 transition">
                  Earning Ledger
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Trust & Legal */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Trust &amp; Legal</span>
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <span
                  onClick={() => setActivePolicy("terms")}
                  className="hover:text-cyan-400 transition cursor-pointer"
                >
                  Terms &amp; Conditions
                </span>
              </li>
              <li>
                <span
                  onClick={() => setActivePolicy("privacy")}
                  className="hover:text-cyan-400 transition cursor-pointer"
                >
                  Privacy Policy
                </span>
              </li>
              <li>
                <span
                  onClick={() => setActivePolicy("refund")}
                  className="hover:text-cyan-400 transition cursor-pointer"
                >
                  Refund &amp; Cancellation Policy
                </span>
              </li>
              <li>
                <span
                  onClick={() => setFeeModalOpen(true)}
                  className="hover:text-cyan-400 transition cursor-pointer"
                >
                  Platform Fee Policy
                </span>
              </li>
              <li>
                <Link href="/contact" className="hover:text-cyan-400 transition">
                  Contact &amp; UAID Reactivation
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-cyan-400 transition text-slate-400">
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p className="text-slate-400">© {new Date().getFullYear()} Noryvanta. All rights reserved.</p>
          <p className="text-slate-400">
            &ldquo;Your Business, Your Product &amp; Your Marketplace&rdquo;
          </p>
        </div>
      </div>

      {/* Business Platform Fee Modal (Canonical Versioned Schedule) */}
      <BusinessPlatformFeeModal
        isOpen={feeModalOpen}
        onClose={() => setFeeModalOpen(false)}
      />

      {/* General Legal Policy Modal */}
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#113D60] text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-slate-700/60 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
              <h3 className="text-base font-bold text-white capitalize">
                {activePolicy === "terms"
                  ? "Terms & Conditions"
                  : activePolicy === "privacy"
                  ? "Privacy Policy"
                  : "Refund & Cancellation Policy"}
              </h3>
              <button
                onClick={() => setActivePolicy(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1 bg-slate-800 rounded-lg border border-slate-700 transition"
              >
                Close ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed max-h-80 overflow-y-auto space-y-3 pr-1">
              {activePolicy === "terms" && (
                <>
                  <p>
                    <strong className="text-white">1. Platform Nature:</strong> Noryvanta operates as an intermediary B2B technology marketplace connecting verified businesses, manufacturers, wholesalers, distributors, service providers, and buyers across India.
                  </p>
                  <p>
                    <strong className="text-white">2. Platform Fee Terms:</strong> Noryvanta may charge a platform fee on eligible successful transactions. The applicable platform fee is determined by the business category registered with Noryvanta (Wholesaler: 3.20%, Distributor: 5.20%, Services: 5.20%, Retailer: 8.20%).
                  </p>
                  <p>
                    <strong className="text-white">3. Sovereign Escrow:</strong> All customer payments are retained securely in an RBI-compliant institutional escrow account until delivery milestone verification is completed.
                  </p>
                  <p>
                    <strong className="text-white">4. Quarterly Purchase Rule:</strong> To maintain active verified merchant status, retain commercial tier benefits, and preserve reward units, registered commercial businesses must execute at least one qualifying commercial purchase or transaction per fiscal quarter (every 90 days), backed by a 30-day grace period.
                  </p>
                  <p>
                    <strong className="text-white">5. Reward Units Exclusivity (Repurchase Only):</strong> Noryvanta Reward Units are proprietary digital repurchase credits issued under trade benchmarks. They are usable solely to offset order payable amounts on the Noryvanta B2B Marketplace. Reward units are <strong>strictly non-cash, non-withdrawable</strong>, and cannot be transferred to any personal or commercial bank account or third party directly.
                  </p>
                  <p>
                    <strong className="text-white">6. Referral NRY ID Genesis &amp; Onboarding:</strong> First-time business registration and initial onboarding login strictly mandate a valid, verified Referral NRY ID from an existing network participant. The Genesis Root NRY ID is initialized exclusively by the Platform Owner/Super-Admin at production launch without an incoming referral ID.
                  </p>
                </>
              )}

              {activePolicy === "refund" && (
                <>
                  <p>
                    <strong className="text-white">1. Inspection Window:</strong> Buyers are entitled to an inspection window of 48 hours following verified delivery to check goods against purchase order specifications.
                  </p>
                  <p>
                    <strong className="text-white">2. Dispute &amp; Escrow Treatment:</strong> During active disputes, funds in escrow remain protected. Refunds are processed according to the backend dispute resolution determination.
                  </p>
                  <p>
                    <strong className="text-white">3. Platform Fee Treatment:</strong> Platform fee treatments upon approved refunds follow the configured business-category fee and statutory refund rules.
                  </p>
                </>
              )}

              {activePolicy === "privacy" && (
                <>
                  <p>
                    <strong className="text-white">1. DPDP Act 2023 Compliance:</strong> All corporate, merchant, and user data is processed in accordance with the Digital Personal Data Protection Act, 2023.
                  </p>
                  <p>
                    <strong className="text-white">2. Data Residency:</strong> All data resides within sovereign tier-IV data centers located within the Republic of India.
                  </p>
                  <p>
                    <strong className="text-white">3. Financial Privacy:</strong> Business financial ledgers, platform fee settlement logs, and bank account credentials are kept strictly confidential and never exposed publicly.
                  </p>
                </>
              )}
            </div>

            <button
              onClick={() => setActivePolicy(null)}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};
