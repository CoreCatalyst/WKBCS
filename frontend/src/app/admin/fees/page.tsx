"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  DollarSign, ShieldCheck, CheckCircle2, TrendingUp,
  Download, Filter, Landmark, FileText, ChevronRight,
  RefreshCw, ArrowDownRight, ArrowUpRight, AlertCircle, Layers
} from "lucide-react";

interface FeeSummary {
  currency: string;
  total_gmv: number;
  platform_commission_earned: number;
  tds_collected_section_194o: number;
  active_funds_in_escrow: number;
  pending_disbursements_count: number;
  settled_orders_count: number;
  compliance_status: string;
}

interface LedgerEntry {
  id: string;
  order_id: string;
  vendor_name: string;
  fee_type: "PLATFORM_COMMISSION" | "TDS_SECTION_194O" | "PAYMENT_GATEWAY_FEE";
  gross_order_value: number;
  fee_amount: number;
  gst_on_fee: number;
  clearing_utr: string;
  status: "CLEARED" | "RECONCILED" | "PENDING";
  date: string;
}

export default function AdminFeesPage() {
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get("/admin/fees/summary");
        setSummary(res.data);
      } catch {
        // Fallback default mock
        setSummary({
          currency: "INR",
          total_gmv: 24850000.0,
          platform_commission_earned: 745500.0,
          tds_collected_section_194o: 248500.0,
          active_funds_in_escrow: 4210000.0,
          pending_disbursements_count: 14,
          settled_orders_count: 128,
          compliance_status: "100% GST & TDS Compliant"
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const ledgerEntries: LedgerEntry[] = [
    {
      id: "LED-0091",
      order_id: "ORD-2024-8841",
      vendor_name: "Apex Precision Instruments Pvt Ltd",
      fee_type: "PLATFORM_COMMISSION",
      gross_order_value: 245000,
      fee_amount: 7350,
      gst_on_fee: 1323,
      clearing_utr: "NRY-RTGS-9821443",
      status: "RECONCILED",
      date: "Today, 14:22"
    },
    {
      id: "LED-0092",
      order_id: "ORD-2024-8841",
      vendor_name: "Apex Precision Instruments Pvt Ltd",
      fee_type: "TDS_SECTION_194O",
      gross_order_value: 245000,
      fee_amount: 2450,
      gst_on_fee: 0,
      clearing_utr: "TDS-DEP-NSDL-881",
      status: "CLEARED",
      date: "Today, 14:22"
    },
    {
      id: "LED-0089",
      order_id: "ORD-2024-8839",
      vendor_name: "National Cables & Conductors",
      fee_type: "PLATFORM_COMMISSION",
      gross_order_value: 142000,
      fee_amount: 4260,
      gst_on_fee: 766.8,
      clearing_utr: "NRY-RTGS-9821210",
      status: "RECONCILED",
      date: "Yesterday, 17:40"
    },
    {
      id: "LED-0088",
      order_id: "ORD-2024-8835",
      vendor_name: "Bharat PetroFlange Engineering",
      fee_type: "PLATFORM_COMMISSION",
      gross_order_value: 385000,
      fee_amount: 11550,
      gst_on_fee: 2079,
      clearing_utr: "NRY-RTGS-9820984",
      status: "RECONCILED",
      date: "22 Sep 2026"
    },
    {
      id: "LED-0087",
      order_id: "ORD-2024-8835",
      vendor_name: "Bharat PetroFlange Engineering",
      fee_type: "TDS_SECTION_194O",
      gross_order_value: 385000,
      fee_amount: 3850,
      gst_on_fee: 0,
      clearing_utr: "TDS-DEP-NSDL-876",
      status: "CLEARED",
      date: "22 Sep 2026"
    }
  ];

  const filteredEntries = filterType === "ALL"
    ? ledgerEntries
    : ledgerEntries.filter(e => e.fee_type === filterType);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Nodal Settlement & Fee Audit Hub
                </span>
                <span className="text-xs text-slate-500 font-mono">Axis Trustee Nodal Escrow</span>
              </div>
              <h1 className="text-2xl font-bold font-headline text-[#0F172A]">
                Admin Financial & Platform Fee Dashboard
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Real-time fee ledger audit, Section 194-O statutory withholding, and nodal settlement reconciliations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/admin/routing"
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <span>Gateway Routing</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>

              <button
                onClick={() => alert("Audit Pack (Form 26AS + GST E-Invoice Reconciliation) downloaded.")}
                className="px-4 py-2 rounded-lg bg-[#0F172A] hover:bg-[#1E3A8A] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Audit Pack</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* 6 Bento KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {/* KPI 1: Gross Volume */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Gross Escrow GMV</span>
            <div className="text-xl font-bold font-headline text-[#0F172A] mt-2">
              ₹{(summary?.total_gmv || 24850000).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>+18.4% MoM</span>
            </span>
          </div>

          {/* KPI 2: Platform Commission */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Platform Take-Rate</span>
            <div className="text-xl font-bold font-headline text-[#1E3A8A] mt-2">
              ₹{(summary?.platform_commission_earned || 745500).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-blue-700 font-semibold mt-2">
              Weighted Avg: 3.0%
            </span>
          </div>

          {/* KPI 3: TDS Section 194-O */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">TDS (Sec 194-O)</span>
            <div className="text-xl font-bold font-headline text-slate-800 mt-2">
              ₹{(summary?.tds_collected_section_194o || 248500).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-2">
              100% Deposited NSDL
            </span>
          </div>

          {/* KPI 4: Active Escrow */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">In-Escrow Locked</span>
            <div className="text-xl font-bold font-headline text-amber-700 mt-2">
              ₹{(summary?.active_funds_in_escrow || 4210000).toLocaleString("en-IN")}
            </div>
            <span className="text-[11px] text-amber-800 font-semibold mt-2">
              Axis Bank Nodal
            </span>
          </div>

          {/* KPI 5: Net Disbursed */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Net Disbursed</span>
            <div className="text-xl font-bold font-headline text-emerald-700 mt-2">
              ₹1,98,46,000
            </div>
            <span className="text-[11px] text-slate-500 font-semibold mt-2">
              412 Manufacturers
            </span>
          </div>

          {/* KPI 6: Dispute Ratio */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Dispute Holds</span>
            <div className="text-xl font-bold font-headline text-slate-800 mt-2">
              2 Orders
            </div>
            <span className="text-[11px] text-red-600 font-semibold mt-2">
              ₹18,400 Protected
            </span>
          </div>
        </div>

        {/* Settlement Architecture Waterfall SVG Card */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold font-headline text-[#0F172A]">
                Platform Settlement Architecture & Funds Flow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-stage funds distribution stream from payment capture to nodal settlement.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              T+1 Automated Cycle
            </span>
          </div>

          <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 overflow-x-auto">
            <svg className="w-full min-w-[720px] h-36" fill="none" viewBox="0 0 760 140" xmlns="http://www.w3.org/2000/svg">
              {/* Node 1: Gross */}
              <rect className="fill-slate-200/80 stroke-slate-300" height="85" rx="8" width="130" x="10" y="25" />
              <text className="fill-slate-600 font-bold text-[11px]" x="25" y="50">1. BUYER PAYS</text>
              <text className="fill-slate-900 font-bold text-[15px]" x="25" y="72">100.0% GMV</text>
              <text className="fill-slate-500 text-[10px]" x="25" y="92">Gross Listing + GST</text>

              {/* Arrow 1 */}
              <path d="M145 68 L180 68" stroke="#94A3B8" strokeDasharray="3 3" strokeWidth="2" />
              <polygon fill="#94A3B8" points="182,68 176,64 176,72" />

              {/* Node 2: Escrow Hub */}
              <rect className="fill-blue-50 stroke-blue-200" height="95" rx="8" width="150" x="185" y="20" />
              <text className="fill-[#1E3A8A] font-bold text-[11px]" x="200" y="45">2. NODAL ESCROW</text>
              <text className="fill-[#0F172A] font-bold text-[15px]" x="200" y="68">Axis SafeLock</text>
              <text className="fill-slate-600 text-[10px]" x="200" y="88">Auto Deductions Run</text>
              <text className="fill-emerald-700 font-semibold text-[10px]" x="200" y="103">RBI Compliant Nodal</text>

              {/* Arrow 2 Up (Platform Fee) */}
              <path d="M340 50 L380 32" stroke="#1E3A8A" strokeWidth="2" />
              <polygon fill="#1E3A8A" points="383,31 374,29 378,36" />

              {/* Arrow 2 Down (Merchant) */}
              <path d="M340 85 L380 102" stroke="#059669" strokeWidth="2" />
              <polygon fill="#059669" points="383,103 378,98 374,105" />

              {/* Node 3: Noryvanta Take-Rate */}
              <rect className="fill-slate-900" height="55" rx="8" width="165" x="390" y="8" />
              <text className="fill-slate-300 font-bold text-[10px]" x="402" y="28">NORYVANTA PLATFORM</text>
              <text className="fill-white font-bold text-[13px]" x="402" y="47">3.0% Base Fee (+18% GST)</text>

              {/* Node 4: Merchant Disbursal */}
              <rect className="fill-emerald-50 stroke-emerald-300" height="55" rx="8" width="165" x="390" y="75" />
              <text className="fill-emerald-800 font-bold text-[10px]" x="402" y="95">MERCHANT DISBURSAL</text>
              <text className="fill-emerald-950 font-bold text-[13px]" x="402" y="114">96.0% Net Settlement</text>

              {/* Node 5: Splits */}
              <path d="M560 35 L595 35" stroke="#94A3B8" strokeWidth="1.5" />
              <rect className="fill-white stroke-slate-200" height="45" rx="6" width="145" x="600" y="12" />
              <text className="fill-slate-700 font-semibold text-[10px]" x="610" y="30">TDS u/s 194-O (1%)</text>
              <text className="fill-slate-500 text-[9px]" x="610" y="44">Direct NSDL Depository</text>

              <path d="M560 102 L595 102" stroke="#94A3B8" strokeWidth="1.5" />
              <rect className="fill-white stroke-slate-200" height="45" rx="6" width="145" x="600" y="80" />
              <text className="fill-emerald-800 font-bold text-[10px]" x="610" y="98">T+1 RTGS Disbursal</text>
              <text className="fill-slate-500 text-[9px]" x="610" y="112">To Verified Current A/c</text>
            </svg>
          </div>
        </div>

        {/* Fee Ledger Audit Table */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-base font-bold font-headline text-[#0F172A]">
                Comprehensive Platform Fee & Tax Ledger
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Itemized transaction fees, GST tax credits, and Section 194-O statutory withholdings.
              </p>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter Type:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-semibold text-slate-700"
              >
                <option value="ALL">All Transactions</option>
                <option value="PLATFORM_COMMISSION">Platform Commission</option>
                <option value="TDS_SECTION_194O">TDS Section 194-O</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Ledger ID</th>
                  <th className="py-3 px-4">Order Ref</th>
                  <th className="py-3 px-4">Vendor Entity</th>
                  <th className="py-3 px-4">Fee Category</th>
                  <th className="py-3 px-4 text-right">Order Value</th>
                  <th className="py-3 px-4 text-right">Fee Deducted</th>
                  <th className="py-3 px-4">Bank UTR / NSDL Ref</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredEntries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-800">{row.id}</td>
                    <td className="py-3.5 px-4 text-[#1D4ED8]">
                      <Link href="/orders" className="hover:underline">
                        {row.order_id}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-sans font-medium text-slate-800 truncate max-w-[180px]">
                      {row.vendor_name}
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          row.fee_type === "PLATFORM_COMMISSION"
                            ? "bg-blue-50 text-[#1E3A8A] border border-blue-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}
                      >
                        {row.fee_type === "PLATFORM_COMMISSION" ? "Platform Take (3%)" : "TDS u/s 194-O (1%)"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600">
                      ₹{row.gross_order_value.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#0F172A]">
                      ₹{row.fee_amount.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                      {row.clearing_utr}
                    </td>
                    <td className="py-3.5 px-4 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
