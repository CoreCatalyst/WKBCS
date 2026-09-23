"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Link from "next/link";
import {
  BarChart3, TrendingUp, Package, ShieldCheck, Bell, ArrowUpRight,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Star, Users, IndianRupee,
  RefreshCw, Filter, ChevronRight
} from "lucide-react";

const DEMO_METRICS = {
  total_gmv: 48234000,
  active_orders: 23,
  pending_escrow: 8920500,
  verified_vendors: 312,
  pending_kyc: 7,
  fulfillment_rate: 97.4,
  dispute_rate: 0.8,
  platform_fee_earned: 1447020
};

const DEMO_ALERTS = [
  { type: "warning", message: "7 vendor KYC documents awaiting review", time: "2 hrs ago" },
  { type: "info", message: "ESC_NORY_BETA escrow auto-released on delivery confirmation", time: "4 hrs ago" },
  { type: "success", message: "RBI compliance audit passed — Q2 2026", time: "1 day ago" },
  { type: "error", message: "Order ORD-2024-015 dispute raised — mediation required", time: "3 hrs ago" },
];

const DEMO_ORDERS = [
  { id: "ORD-2024-045", buyer: "Apex Pharma Pvt. Ltd.", vendor: "MedPack India", amount: 234000, status: "DISPATCHED" },
  { id: "ORD-2024-046", buyer: "TechForge Industries", vendor: "PrecisionWorks", amount: 87500, status: "IN_PRODUCTION" },
  { id: "ORD-2024-047", buyer: "Bharat Agro Corp", vendor: "AgriTech Mfg.", amount: 118000, status: "PENDING" },
  { id: "ORD-2024-048", buyer: "NovaBuild Infra", vendor: "SafetyPro Mfg.", amount: 420000, status: "COMPLETED" },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-50 border-amber-200 text-amber-700",
  IN_PRODUCTION: "bg-blue-50 border-blue-200 text-blue-700",
  DISPATCHED: "bg-indigo-50 border-indigo-200 text-indigo-700",
  DELIVERED: "bg-purple-50 border-purple-200 text-purple-700",
  COMPLETED: "bg-emerald-50 border-emerald-200 text-emerald-700",
  DISPUTED: "bg-red-50 border-red-200 text-red-700",
};

const ALERT_ICON: Record<string, React.ElementType> = {
  warning: AlertCircle,
  info: Bell,
  success: CheckCircle2,
  error: AlertCircle
};
const ALERT_COLOR: Record<string, string> = {
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  info: "text-blue-600 bg-blue-50 border-blue-200",
  success: "text-emerald-700 bg-emerald-50 border-emerald-200",
  error: "text-red-700 bg-red-50 border-red-200"
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [metrics] = useState(DEMO_METRICS);
  const [orders] = useState(DEMO_ORDERS);
  const [alerts] = useState(DEMO_ALERTS);
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const fmtINR = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(1)}Cr` :
    n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` :
    `₹${n.toLocaleString("en-IN")}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-headline text-[#0F172A]">
            {greeting}, {user?.full_name?.split(" ")[0] || "Admin"} 👋
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Here's your Noryvanta platform summary for today.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />Live · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total GMV", value: fmtINR(metrics.total_gmv), sub: "Gross Merchandise Value", icon: IndianRupee, color: "text-[#1E3A8A]", bg: "bg-blue-50", trend: "+12.4% MoM" },
          { label: "Active Orders", value: metrics.active_orders, sub: "Across all escrow stages", icon: Package, color: "text-purple-700", bg: "bg-purple-50", trend: "+3 today" },
          { label: "Escrow Locked", value: fmtINR(metrics.pending_escrow), sub: "Awaiting milestone", icon: ShieldCheck, color: "text-[#10B981]", bg: "bg-emerald-50", trend: "23 open" },
          { label: "Verified Vendors", value: metrics.verified_vendors, sub: "KYC complete", icon: Users, color: "text-amber-700", bg: "bg-amber-50", trend: `${metrics.pending_kyc} pending` },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <span className="text-[11px] text-slate-400 font-medium flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3 text-[#10B981]" />{card.trend}
                </span>
              </div>
              <div>
                <p className="text-xl font-bold font-headline text-[#0F172A]">{card.value}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{card.label}</p>
                <p className="text-[10px] text-slate-400">{card.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] font-headline">Recent Orders</h2>
            <Link href="/orders" className="text-[11px] text-[#1D4ED8] font-semibold flex items-center gap-1 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {orders.map(o => (
              <div key={o.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <p className="text-xs font-bold text-[#0F172A]">{o.id}</p>
                  <p className="text-[11px] text-slate-500">{o.buyer} → {o.vendor}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold font-headline text-[#0F172A]">{fmtINR(o.amount)}</span>
                  <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border ${STATUS_BADGE[o.status]}`}>{o.status.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Alerts */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0F172A] font-headline">Platform Alerts</h2>
            <Bell className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {alerts.map((a, i) => {
              const Icon = ALERT_ICON[a.type];
              return (
                <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                  <div className={`mt-0.5 w-6 h-6 rounded-lg ${ALERT_COLOR[a.type]} flex items-center justify-center shrink-0 border`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#0F172A] leading-snug">{a.message}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Fulfillment Rate", value: `${metrics.fulfillment_rate}%`, color: "text-[#10B981]" },
          { label: "Dispute Rate", value: `${metrics.dispute_rate}%`, color: "text-red-600" },
          { label: "Platform Fees Earned", value: fmtINR(metrics.platform_fee_earned), color: "text-[#1E3A8A]" },
          { label: "Pending KYC Reviews", value: metrics.pending_kyc, color: "text-amber-600" },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5">
            <p className="text-[11px] text-slate-500 mb-2">{item.label}</p>
            <p className={`text-2xl font-bold font-headline ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#0F172A] font-headline">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Browse Products", href: "/products", color: "bg-[#0F172A] text-white" },
            { label: "Track Orders", href: "/orders", color: "bg-white border border-[#E2E8F0] text-slate-700" },
            { label: "Vendor Profile", href: "/vendor/profile", color: "bg-white border border-[#E2E8F0] text-slate-700" },
            { label: "Raise Dispute", href: "/orders", color: "bg-red-50 border border-red-200 text-red-700" },
          ].map(({ label, href, color }) => (
            <Link
              key={label}
              href={href}
              className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:shadow-sm transition ${color}`}
            >
              {label}<ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
