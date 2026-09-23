"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import {
  Package, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Truck, ShieldCheck, FileText, Star, MessageSquare, Download,
  Filter, Search, X
} from "lucide-react";

interface Order {
  id: string;
  status: string;
  product_name: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  escrow_id: string;
  vendor_name: string;
  created_at: string;
  expected_delivery: string;
  tracking_id?: string;
  milestones: { label: string; done: boolean; date?: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
  IN_PRODUCTION: { label: "In Production", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: Package },
  DISPATCHED: { label: "Dispatched", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200", icon: Truck },
  DELIVERED: { label: "Delivered — Inspection", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: ShieldCheck },
  COMPLETED: { label: "Completed", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  DISPUTED: { label: "Disputed", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: AlertCircle },
};

const DEMO_ORDERS: Order[] = [
  {
    id: "ORD-2024-001",
    status: "IN_PRODUCTION",
    product_name: "Industrial Safety Gloves (ISO 11612)",
    product_id: "prod_1",
    quantity: 500,
    unit_price: 228,
    total_amount: 134640,
    escrow_id: "ESC_NORY_ALPHA",
    vendor_name: "SafetyPro Mfg. Pvt. Ltd.",
    created_at: "2026-09-15",
    expected_delivery: "2026-10-05",
    tracking_id: "NORY-TRK-888421",
    milestones: [
      { label: "Order Placed & Escrow Locked", done: true, date: "Sep 15" },
      { label: "Vendor Acknowledged", done: true, date: "Sep 16" },
      { label: "In Production", done: true, date: "Sep 18" },
      { label: "Quality Inspection at Vendor", done: false },
      { label: "Dispatched", done: false },
      { label: "Delivered — Inspection Window", done: false },
      { label: "Payment Released to Vendor", done: false },
    ]
  },
  {
    id: "ORD-2024-002",
    status: "DISPATCHED",
    product_name: "CNC Aluminium Fittings (6061-T6)",
    product_id: "prod_2",
    quantity: 200,
    unit_price: 1240,
    total_amount: 292880,
    escrow_id: "ESC_NORY_BETA",
    vendor_name: "PrecisionWorks CNC Ltd.",
    created_at: "2026-09-10",
    expected_delivery: "2026-09-30",
    tracking_id: "NORY-TRK-776501",
    milestones: [
      { label: "Order Placed & Escrow Locked", done: true, date: "Sep 10" },
      { label: "Vendor Acknowledged", done: true, date: "Sep 11" },
      { label: "In Production", done: true, date: "Sep 13" },
      { label: "Quality Inspection at Vendor", done: true, date: "Sep 20" },
      { label: "Dispatched", done: true, date: "Sep 22" },
      { label: "Delivered — Inspection Window", done: false },
      { label: "Payment Released to Vendor", done: false },
    ]
  },
  {
    id: "ORD-2024-003",
    status: "COMPLETED",
    product_name: "Pharmaceutical Packaging — Blister Film Rolls",
    product_id: "prod_3",
    quantity: 1000,
    unit_price: 86,
    total_amount: 101480,
    escrow_id: "ESC_NORY_GAMMA",
    vendor_name: "MedPack India Pvt. Ltd.",
    created_at: "2026-08-28",
    expected_delivery: "2026-09-12",
    tracking_id: "NORY-TRK-654301",
    milestones: [
      { label: "Order Placed & Escrow Locked", done: true, date: "Aug 28" },
      { label: "Vendor Acknowledged", done: true, date: "Aug 29" },
      { label: "In Production", done: true, date: "Sep 01" },
      { label: "Quality Inspection at Vendor", done: true, date: "Sep 07" },
      { label: "Dispatched", done: true, date: "Sep 09" },
      { label: "Delivered — Inspection Window", done: true, date: "Sep 12" },
      { label: "Payment Released to Vendor", done: true, date: "Sep 14" },
    ]
  }
];

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>(DEMO_ORDERS);
  const [expandedId, setExpandedId] = useState<string | null>("ORD-2024-001");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [ratingModal, setRatingModal] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");

  const filtered = orders.filter(o => {
    if (filterStatus !== "ALL" && o.status !== filterStatus) return false;
    if (search && !o.product_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleRaiseDispute = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: "DISPUTED"} : o));
  };

  const handleReleasePayment = async (orderId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? {...o, status: "COMPLETED"} : o));
  };

  const handleSubmitRating = (orderId: string) => {
    console.log("Rating submitted for", orderId, rating, review);
    setRatingModal(null);
    setRating(0);
    setReview("");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-headline text-[#0F172A]">My Orders & Escrow Tracking</h1>
        <p className="text-xs text-slate-500 mt-0.5">Monitor production milestones, track shipments, and manage escrow releases.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 focus:border-[#1D4ED8]"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "PENDING", "IN_PRODUCTION", "DISPATCHED", "DELIVERED", "COMPLETED", "DISPUTED"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition ${
                filterStatus === s
                  ? "bg-[#0F172A] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>
      </div>

      {/* Orders list */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm">No orders match your filters.</div>
        )}
        {filtered.map(order => {
          const st = STATUS_CONFIG[order.status] || STATUS_CONFIG["PENDING"];
          const Icon = st.icon;
          const isExpanded = expandedId === order.id;
          const completedMilestones = order.milestones.filter(m => m.done).length;
          const progress = (completedMilestones / order.milestones.length) * 100;

          return (
            <div key={order.id} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              {/* Order Card Header */}
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Package className="w-5 h-5 text-[#1E3A8A]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0F172A]">{order.product_name}</p>
                      <p className="text-[11px] text-slate-500">{order.id} · {order.vendor_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 ${st.bg} ${st.color}`}>
                      <Icon className="w-3.5 h-3.5" />{st.label}
                    </span>
                    <span className="text-sm font-bold font-headline text-[#1E3A8A]">
                      ₹{order.total_amount.toLocaleString("en-IN")}
                    </span>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>{completedMilestones}/{order.milestones.length} milestones complete</span>
                    <span>Delivery by {order.expected_delivery}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#1E3A8A] to-[#10B981] rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-[#E2E8F0] bg-slate-50 p-5 space-y-5">
                  {/* Milestones */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Milestone Timeline</h3>
                    <div className="space-y-2">
                      {order.milestones.map((m, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            m.done ? "bg-[#10B981]" : "bg-slate-200"
                          }`}>
                            {m.done ? (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            )}
                          </div>
                          <span className={`text-xs flex-1 ${m.done ? "text-[#0F172A] font-medium" : "text-slate-400"}`}>{m.label}</span>
                          {m.date && <span className="text-[11px] text-slate-400">{m.date}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div><p className="text-slate-400">Quantity</p><p className="font-bold">{order.quantity} units</p></div>
                    <div><p className="text-slate-400">Unit Price</p><p className="font-bold">₹{order.unit_price}</p></div>
                    <div><p className="text-slate-400">Escrow ID</p><p className="font-mono text-[11px] font-bold text-[#1E3A8A]">{order.escrow_id}</p></div>
                    <div><p className="text-slate-400">Tracking ID</p><p className="font-mono text-[11px] font-bold">{order.tracking_id || "—"}</p></div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
                    <Link
                      href={`/orders/${order.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] hover:bg-[#1E3A8A] text-white rounded-lg text-[11px] font-bold transition shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-300" />
                      <span>Settlement Detail</span>
                    </Link>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <Download className="w-3.5 h-3.5" />GST Invoice
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition">
                      <MessageSquare className="w-3.5 h-3.5" />Message Vendor
                    </button>
                    {order.status === "DELIVERED" && (
                      <>
                        <button
                          onClick={() => handleReleasePayment(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />Release Escrow Payment
                        </button>
                        <button
                          onClick={() => handleRaiseDispute(order.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-[11px] font-bold hover:bg-red-100 transition"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />Raise Dispute
                        </button>
                      </>
                    )}
                    {order.status === "COMPLETED" && (
                      <button
                        onClick={() => setRatingModal(order.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition"
                      >
                        <Star className="w-3.5 h-3.5" />Rate Vendor
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-elevated max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold font-headline text-[#0F172A]">Rate Vendor Performance</h3>
              <button onClick={() => setRatingModal(null)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-700" />
              </button>
            </div>
            <div className="flex justify-center gap-2">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star className={`w-8 h-8 transition ${s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              placeholder="Write a review about quality, delivery, and communication..."
              value={review}
              onChange={e => setReview(e.target.value)}
              className="w-full border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
            />
            <button
              onClick={() => handleSubmitRating(ratingModal)}
              disabled={rating === 0}
              className="w-full py-2.5 bg-[#0F172A] text-white text-xs font-bold rounded-lg disabled:opacity-50 transition hover:bg-[#1E3A8A]"
            >
              Submit Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
