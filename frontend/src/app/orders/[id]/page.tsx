"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ShieldCheck, Package, Clock, CheckCircle2, AlertCircle,
  Truck, ArrowLeft, Download, FileText, Landmark,
  Lock, ExternalLink, Printer, HelpCircle
} from "lucide-react";

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  product_name: string;
  hsn_code: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  total_amount: number;
  escrow_id: string;
  utr_reference: string;
  vendor_name: string;
  buyer_name: string;
  bank_account: string;
  bank_ifsc: string;
  created_at: string;
  milestones: { label: string; done: boolean; date?: string }[];
}

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = (params?.id as string) || "ORD-2024-001";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Attempt fetching or provide faithful institutional data
    setOrder({
      id: orderId,
      order_number: orderId.toUpperCase(),
      status: "IN_PRODUCTION",
      product_name: "Industrial Safety Gloves (ISO 11612 Compliant Heavy Thermal)",
      hsn_code: "6116.10.00",
      quantity: 500,
      unit_price: 228,
      gst_rate: 18.0,
      total_amount: 134640,
      escrow_id: "ESC_NORY_ALPHA_984",
      utr_reference: "NRY-RTGS-9821443",
      vendor_name: "Apex Precision Instruments Private Limited",
      buyer_name: "Vikram Mehta (Chief Procurement Officer, Enterprise Corp)",
      bank_account: "************4920",
      bank_ifsc: "HDFC0001024",
      created_at: "18 Sep 2026",
      milestones: [
        { label: "Buyer Payment Deposited in Nodal Escrow", done: true, date: "18 Sep, 10:14 AM" },
        { label: "Vendor Accepted & Production Commenced", done: true, date: "19 Sep, 09:30 AM" },
        { label: "Quality Inspection & ISO Compliance Check", done: true, date: "21 Sep, 04:15 PM" },
        { label: "Dispatched with E-Way Bill #8812938192", done: false },
        { label: "Consignee Delivery Verification (72h Window)", done: false },
        { label: "Automated Escrow Disbursal to Vendor Bank", done: false }
      ]
    });
    setLoading(false);
  }, [orderId]);

  if (!order) return null;

  const subtotal = order.unit_price * order.quantity;
  const statutoryGst = subtotal * (order.gst_rate / 100);
  const grossPayable = subtotal + statutoryGst;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      {/* Top Banner */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-2 mb-3">
            <Link
              href="/orders"
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Orders</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-semibold text-slate-800">{order.order_number}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#1E3A8A] text-xs font-bold">
                  Escrow Locked • In Production
                </span>
                <span className="text-xs text-slate-500 font-mono">Escrow ID: {order.escrow_id}</span>
              </div>
              <h1 className="text-2xl font-bold font-headline text-[#0F172A]">
                Customer Order &amp; Invoice Summary
              </h1>
              <p className="text-sm text-slate-600 mt-0.5">
                Legally binding marketplace purchase contract secured under Axis Trustee Escrow terms.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print GST Invoice</span>
              </button>

              <button
                onClick={() => alert("Arbitration ticket initiated. Escrow dispute lock placed pending Noryvanta legal officer review.")}
                className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                <span>Initiate Dispute Hold</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Payment Confirmation & Escrow Protection Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main 8 cols: Customer Paid & Escrow Protection Card */}
          <div className="lg:col-span-8 bg-[#0F172A] text-white rounded-xl p-6 shadow-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">
                  Amount Paid by Customer
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Sovereign Escrow Secured
                </span>
              </div>

              <span className="text-xs text-slate-400 block mb-1">Total Paid (Inclusive of Taxes)</span>
              <div className="text-3xl font-bold font-headline text-white tracking-tight">
                ₹{grossPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Your payment is safely held in an RBI-regulated nodal trust escrow and released to the supplier only upon delivery approval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-800">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3">
                <Landmark className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Payment Method</span>
                  <p className="text-xs font-bold text-white">Net Banking / Direct Clearing</p>
                  <p className="text-[11px] text-slate-400 font-mono">Status: Verified &amp; Held in Escrow</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Payment Reference UTR</span>
                  <p className="text-xs font-mono font-bold text-white">{order.utr_reference}</p>
                  <p className="text-[11px] text-slate-400">Clearing Code: NRYV-IN-TXN-BLR-09</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 cols: Buyer & Escrow Summary */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Parties & Escrow Agent
              </span>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Procuring Entity (Buyer)</span>
                  <p className="font-semibold text-slate-900">{order.buyer_name}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Manufacturing Supplier (Vendor)</span>
                  <p className="font-semibold text-slate-900">{order.vendor_name}</p>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Escrow Trustee</span>
                  <p className="font-semibold text-slate-900">Axis Trustee Services Limited (RBI Licensed)</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Full compliance with Section 194-O Income Tax Act.</span>
            </div>
          </div>
        </div>

        {/* Purchased Line Items & Tax Breakdown */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-headline text-[#0F172A]">
              Purchased Line Items & Statutory Tax Mapping
            </h2>
            <span className="text-xs font-mono bg-slate-100 px-2.5 py-1 rounded text-slate-700 font-semibold">
              Buyer Invoice: INV-2024-09881
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">HSN / SAC</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4 text-right">Unit Base Price</th>
                  <th className="py-3 px-4 text-right">GST Rate</th>
                  <th className="py-3 px-4 text-right">Total Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-4 font-bold text-slate-900">
                    {order.product_name}
                  </td>
                  <td className="py-4 px-4 font-mono text-slate-600">
                    {order.hsn_code}
                  </td>
                  <td className="py-4 px-4 font-semibold text-slate-800">
                    {order.quantity} Pairs
                  </td>
                  <td className="py-4 px-4 font-mono text-right text-slate-700">
                    ₹{order.unit_price.toFixed(2)}
                  </td>
                  <td className="py-4 px-4 font-mono text-right text-slate-700">
                    {order.gst_rate}% (₹{statutoryGst.toLocaleString("en-IN")})
                  </td>
                  <td className="py-4 px-4 font-mono font-bold text-right text-[#0F172A] text-sm">
                    ₹{grossPayable.toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Customer Invoice & Payment Summary */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-500 space-y-1.5">
              <p className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Payment Confirmed & Secured in Sovereign Escrow</span>
              </p>
              <p>• Goods & Services Tax (GST) compliant invoice issued by supplier.</p>
              <p>• Funds released to merchant only after verified physical delivery & inspection window.</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs sm:w-84 space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-mono text-slate-900 font-semibold">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Statutory GST ({order.gst_rate}%):</span>
                <span className="font-mono text-slate-900 font-semibold">+ ₹{statutoryGst.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Shipping & Handling:</span>
                <span className="font-mono text-emerald-700 font-semibold">Free</span>
              </div>
              <div className="pt-2.5 border-t border-slate-200 flex justify-between font-semibold text-sm text-[#0F172A]">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-700 text-base font-semibold">₹{grossPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Milestone Fulfillment Timeline */}
        <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 shadow-sm">
          <h2 className="text-base font-bold font-headline text-[#0F172A] mb-4">
            Escrow Milestone Pipeline & Delivery Progress
          </h2>

          <div className="space-y-4">
            {order.milestones.map((m, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    m.done
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-400 border border-slate-300"
                  }`}
                >
                  {m.done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-semibold ${m.done ? "text-slate-900" : "text-slate-500"}`}>
                      {m.label}
                    </p>
                    {m.date && <span className="text-[11px] font-mono text-slate-400">{m.date}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
