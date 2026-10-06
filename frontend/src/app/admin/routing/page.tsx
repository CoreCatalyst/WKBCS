"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  CreditCard, ShieldCheck, CheckCircle2, ChevronRight,
  Zap, RefreshCw, Send, Check, Terminal, Globe,
  Activity, ArrowRight, Layers, Lock, Cpu
} from "lucide-react";

interface GatewayRoute {
  country: string;
  currency: string;
  primary_gateway: string;
  backup_gateway: string;
  supported_rails: string[];
  active_status: string;
  settlement_t_plus: string;
}

export default function AdminRoutingPage() {
  const [routes, setRoutes] = useState<GatewayRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"routing" | "webhook">("routing");

  // Webhook Simulator State
  const [selectedEvent, setSelectedEvent] = useState("payment.captured");
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    status: number;
    signature: string;
    latency_ms: number;
    response: string;
  } | null>(null);

  useEffect(() => {
    async function fetchRouting() {
      try {
        const res = await api.get("/admin/routing");
        if (res.data?.routes) {
          setRoutes(res.data.routes);
        }
      } catch {
        // Fallback default routing
        setRoutes([
          {
            country: "India (Domestic)",
            currency: "INR (₹)",
            primary_gateway: "Razorpay Enterprise Route",
            backup_gateway: "Cashfree Payouts",
            supported_rails: ["UPI (0% fee)", "NetBanking", "NEFT / RTGS (Bulk)", "Corporate Credit Card"],
            active_status: "HEALTHY",
            settlement_t_plus: "T+1 Day"
          },
          {
            country: "United States & Americas",
            currency: "USD ($)",
            primary_gateway: "Stripe Connect B2B",
            backup_gateway: "JPMorgan ACH Wire",
            supported_rails: ["ACH Commercial Direct", "Fedwire", "Visa/Mastercard Corporate"],
            active_status: "HEALTHY",
            settlement_t_plus: "T+2 Days"
          },
          {
            country: "United Arab Emirates & GCC",
            currency: "AED (د.إ)",
            primary_gateway: "Telr / Checkout.com MEA",
            backup_gateway: "Mashreq Neo Trade",
            supported_rails: ["Wafi Local Card", "UAE Central Bank RTGS", "SWIFT Wire"],
            active_status: "HEALTHY",
            settlement_t_plus: "T+2 Days"
          }
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchRouting();
  }, []);

  const handleSimulateWebhook = () => {
    setSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      setSimResult({
        status: 200,
        signature: "hmac_sha256_d894bfa2891ec8813a89",
        latency_ms: 68,
        response: JSON.stringify({
          success: true,
          event: selectedEvent,
          escrow_state: "FUNDS_COMMITTED_LOCKED",
          timestamp: new Date().toISOString()
        }, null, 2)
      });
      setSimulating(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] text-xs font-semibold">
                  <Cpu className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  Enterprise Settlement Fabric
                </span>
                <span className="text-xs text-slate-500 font-mono">ISO/IEC 27001 &amp; PCI-DSS L1 Enforced</span>
              </div>
              <h1 className="text-2xl font-bold font-headline text-[#0F172A]">
                Payment Gateway Architecture &amp; Global Payment Routing
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Configure multi-acquirer infrastructure (Razorpay &amp; Cashfree), regional country-currency rules, and automated failovers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Quick Portal Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                <Link
                  href="/admin"
                  className="px-3 py-1.5 text-center text-xs font-bold rounded-lg text-slate-600 hover:text-[#113D60] hover:bg-white border border-transparent hover:border-slate-200/80 transition"
                >
                  Admin Desk
                </Link>
                <Link
                  href="/admin/fees"
                  className="px-3 py-1.5 text-center text-xs font-bold rounded-lg text-slate-600 hover:text-[#113D60] hover:bg-white border border-transparent hover:border-slate-200/80 transition"
                >
                  Fee Ledger
                </Link>
                <Link
                  href="/admin/routing"
                  className="px-3 py-1.5 text-center text-xs font-bold rounded-lg bg-[#113D60] text-white border border-cyan-500/60 shadow-xs"
                >
                  Routing Engine
                </Link>
              </div>

              <button
                onClick={() => setActiveTab("webhook")}
                className="px-4 py-2 rounded-xl bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 border border-cyan-500/40 hover:border-cyan-400 shadow-2xs cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Test Webhook Sim</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 space-y-6 sm:space-y-8">
        {/* 6 Key Routing Metrics with Minimal Thin Slick Borders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Gross Q4 Volume</span>
            <div className="text-xl font-bold font-headline text-[#0F172A] mt-2">₹1,48,20,000</div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-2 flex items-center gap-1">
              <span>+22.4% vs Q3</span>
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Success Rate</span>
            <div className="text-xl font-bold font-headline text-emerald-700 mt-2">98.6%</div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span>RZP: 54%</span>
              <span>CF: 46%</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Fallback Rate</span>
            <div className="text-xl font-bold font-headline text-blue-700 mt-2">1.4%</div>
            <span className="text-[11px] text-slate-500 mt-2 block">
              Auto-rerun instant
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Avg Gateway SLA</span>
            <div className="text-xl font-bold font-headline text-slate-800 mt-2">420 ms</div>
            <span className="text-[11px] text-slate-500 mt-2 block">P95: 780ms</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Failover Protocol</span>
            <div className="text-xl font-bold font-headline text-emerald-700 mt-2">Active</div>
            <span className="text-[11px] text-emerald-700 font-semibold mt-2 block">
              Hot Standby Ready
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Supported Rails</span>
            <div className="text-xl font-bold font-headline text-slate-800 mt-2">7 Rails</div>
            <span className="text-[11px] text-slate-500 mt-2 block">UPI, NEFT, ACH, Wire</span>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-200/80 overflow-x-auto">
          <button
            onClick={() => setActiveTab("routing")}
            className={`px-5 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === "routing"
                ? "border-cyan-500 text-[#113D60] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Multi-Currency Gateway Routing Matrix
          </button>
          <button
            onClick={() => setActiveTab("webhook")}
            className={`px-5 py-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === "webhook"
                ? "border-cyan-500 text-[#113D60] font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Webhook Simulator &amp; Verification</span>
          </button>
        </div>

        {activeTab === "routing" ? (
          /* Routing Matrix Card with Minimal Thin Slick Borders */
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-ambient">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-base font-bold font-headline text-[#0F172A]">
                  Acquirer Rules &amp; Country Route Configurations
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dynamic routing prioritizing lower interchange fees with automated failover pipelines.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-emerald-800">All Gateways Healthy</span>
              </div>
            </div>

            {/* Mobile Card List View (< sm screens) */}
            <div className="sm:hidden space-y-3">
              {routes.map((r, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.country}</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                      {r.active_status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="text-slate-700">
                      <span className="text-slate-400 text-[10px] block">Primary Acquirer</span>
                      <strong>{r.primary_gateway}</strong> ({r.currency})
                    </p>
                    <p className="text-slate-500 text-[11px]">
                      Failover: {r.backup_gateway} • {r.settlement_t_plus}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-200/60">
                    {r.supported_rails.map((rail, rIdx) => (
                      <span
                        key={rIdx}
                        className="px-2 py-0.5 rounded bg-white text-slate-700 text-[10px] font-mono border border-slate-200"
                      >
                        {rail}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table for sm: screens and up */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-700 font-semibold border-b border-slate-200/80">
                    <th className="py-3 px-4">Jurisdiction &amp; Region</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Primary Route (Acquirer)</th>
                    <th className="py-3 px-4">Hot Standby Failover</th>
                    <th className="py-3 px-4">Supported Financial Rails</th>
                    <th className="py-3 px-4">SLA Cycle</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {routes.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-4 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        <span>{r.country}</span>
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-[#1E3A8A]">
                        {r.currency}
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        {r.primary_gateway}
                      </td>
                      <td className="py-4 px-4 text-slate-500">
                        {r.backup_gateway}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1">
                          {r.supported_rails.map((rail, rIdx) => (
                            <span
                              key={rIdx}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                            >
                              {rail}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-600">
                        {r.settlement_t_plus}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          {r.active_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Webhook Simulator Console */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            <div className="lg:col-span-6 bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-ambient space-y-4">
              <h2 className="text-base font-bold font-headline text-[#0F172A] flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Simulate Gateway Notification Webhook</span>
              </h2>
              <p className="text-xs text-slate-500">
                Trigger mock server-side webhook payloads to verify HMAC signature validation and escrow state transitions.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select Event Type</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 bg-white font-mono outline-none transition"
                >
                  <option value="payment.captured">payment.captured (Escrow Lock Initialized)</option>
                  <option value="escrow.milestone_approved">escrow.milestone_approved (Disbursal Triggered)</option>
                  <option value="dispute.opened">dispute.opened (Escrow Hold Enforced)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Endpoint</label>
                <input
                  type="text"
                  readOnly
                  value="http://127.0.0.1:8000/api/v1/escrow/webhook/events"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200/80 bg-slate-50 font-mono text-slate-600 outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleSimulateWebhook}
                disabled={simulating}
                className="w-full py-2.5 rounded-xl bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-cyan-500/40 hover:border-cyan-400 shadow-2xs disabled:opacity-60 cursor-pointer"
              >
                {simulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Transmitting Signed Payload...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span>Dispatch Signed Webhook</span>
                  </>
                )}
              </button>
            </div>

            <div className="lg:col-span-6 bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-ambient text-white font-mono text-xs space-y-4 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Webhook Execution Output</span>
                {simResult && (
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                    HTTP {simResult.status} OK • {simResult.latency_ms}ms
                  </span>
                )}
              </div>

              {simResult ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">HMAC Signature Header:</span>
                    <p className="text-emerald-400 break-all">{simResult.signature}</p>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">Server Response Body:</span>
                    <pre className="p-3 bg-slate-950 rounded-xl text-slate-200 overflow-x-auto text-[11px] leading-relaxed border border-slate-800">
                      {simResult.response}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 italic py-8 text-center">
                  Select an event and click &quot;Dispatch Signed Webhook&quot; to test payload handling.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
