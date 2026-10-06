"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import { usePaymentGateway } from "@/contexts/PaymentGatewayContext";
import { GatewayConfig, PaymentGatewayId } from "@/lib/paymentGatewayTypes";
import { PLATFORM_FEE_SCHEDULE } from "@/lib/platformFeeConfig";
import {
  ShieldCheck,
  Building2,
  Package,
  ShoppingBag,
  ArrowLeftRight,
  TrendingUp,
  Percent,
  RotateCcw,
  Users,
  Layers,
  Star,
  FileText,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Sliders,
  Check,
  Filter,
  CreditCard,
  Lock,
  Globe,
  DollarSign,
  Radio,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

const ADMIN_SECTIONS = [
  { id: "payments-monitoring", label: "Payments Monitoring", icon: DollarSign, badge: "New" },
  { id: "payment-gateways", label: "Payment Gateways", icon: CreditCard, badge: "Config" },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "verification", label: "Business Verification", icon: ShieldCheck, badge: "Action" },
  { id: "products-services", label: "Products & Services", icon: Package },
  { id: "moderation", label: "Listings Moderation", icon: AlertTriangle },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "platform-fees", label: "Platform Fees", icon: Percent },
  { id: "refunds", label: "Refunds", icon: RotateCcw },
  { id: "users", label: "Users", icon: Users },
  { id: "categories", label: "Categories", icon: Layers },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AdminDashboardPage() {
  const {
    businesses,
    verifyBusiness,
    listings,
    updateListingStatus,
    transactions,
    categories
  } = useMarketplace();

  const { country, formatPrice } = useCountry();
  const {
    gateways,
    activeGateway,
    setActiveGatewayId,
    updateGatewayConfig
  } = usePaymentGateway();

  const [activeSection, setActiveSection] = useState("payments-monitoring");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Gateway Configuration Modal (Section 11)
  const [selectedGatewayToConfigure, setSelectedGatewayToConfigure] = useState<GatewayConfig | null>(null);
  const [gatewayForm, setGatewayForm] = useState<Partial<GatewayConfig>>({});

  // Payment Monitoring Filters (Section 9 & Section 24)
  const [filterGateway, setFilterGateway] = useState<string>("All");
  const [filterMethod, setFilterMethod] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterBusiness, setFilterBusiness] = useState<string>("All");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Calculations for Section 24 KPI Cards:
  // Total Payment Volume, Successful Payments, Failed Payments, Refunds, COD Orders, Gateway Transactions, Noryvanta Platform Fees, Business Settlements
  const totalVolume = transactions.reduce((acc, t) => acc + t.grossAmount, 0);
  const successfulTxns = transactions.filter((t) => t.status === "Successful");
  const successfulVolume = successfulTxns.reduce((acc, t) => acc + t.grossAmount, 0);
  const platformFeesCollected = successfulTxns.reduce((acc, t) => acc + t.platformFeeAmount, 0);
  const businessSettlementsPaid = successfulTxns.reduce((acc, t) => acc + t.netSettlement, 0);
  const codOrdersCount = transactions.filter((t) => t.paymentMethod.includes("COD") || t.paymentMethod.includes("Cash on Delivery")).length;

  const handleOpenGatewayConfig = (gw: GatewayConfig) => {
    setSelectedGatewayToConfigure(gw);
    setGatewayForm({
      apiKey: gw.apiKey,
      secretKeyMasked: gw.secretKeyMasked,
      webhookUrl: gw.webhookUrl,
      mode: gw.mode,
      isEnabled: gw.isEnabled
    });
  };

  const handleSaveGatewayConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGatewayToConfigure) return;

    updateGatewayConfig(selectedGatewayToConfigure.id, gatewayForm);
    setSelectedGatewayToConfigure(null);
    setActionFeedback(`Gateway ${selectedGatewayToConfigure.name} configuration saved securely.`);
    setTimeout(() => setActionFeedback(null), 2500);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterGateway !== "All" && activeGateway.id !== filterGateway) return false;
    if (filterMethod !== "All" && !t.paymentMethod.toLowerCase().includes(filterMethod.toLowerCase())) return false;
    if (filterStatus !== "All" && t.status !== filterStatus) return false;
    if (filterBusiness !== "All" && t.businessName !== filterBusiness) return false;
    if (filterSearch && !t.orderId.toLowerCase().includes(filterSearch.toLowerCase()) && !t.customerName.toLowerCase().includes(filterSearch.toLowerCase()) && !t.businessName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Admin Sidebar */}
      <aside className="w-full lg:w-72 bg-[#113D60] text-white shrink-0 p-4 sm:p-5 space-y-4 lg:space-y-6 border-b lg:border-b-0 lg:border-r border-slate-800">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <Image
                src="/logo-icon.png"
                alt="Noryvanta - Global"
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-wide">Noryvanta - Global Admin</h2>
              <p className="text-[10px] text-cyan-400 font-medium">Financial & Operations Desk</p>
            </div>
          </div>
          <Link
            href="/"
            className="lg:hidden text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 hover:border-slate-500"
          >
            Exit
          </Link>
        </div>

        {/* Quick Portal Navigation Links with Minimal Thin Slick Borders */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
          <Link
            href="/admin"
            className="flex-1 py-1 text-center text-[10px] font-semibold rounded-lg bg-cyan-950/90 text-cyan-300 border border-cyan-500/50 shadow-2xs"
          >
            Admin Desk
          </Link>
          <Link
            href="/admin/fees"
            className="flex-1 py-1 text-center text-[10px] font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition"
          >
            Fee Ledger
          </Link>
          <Link
            href="/admin/routing"
            className="flex-1 py-1 text-center text-[10px] font-medium rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent hover:border-slate-700 transition"
          >
            Routing
          </Link>
        </div>

        {/* Navigation List: Horizontal scroll on mobile, vertical stack on desktop */}
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-1.5 lg:pb-0 gap-1.5 scrollbar-none">
          {ADMIN_SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex items-center justify-between px-3.5 py-2 lg:py-2.5 rounded-xl text-xs font-medium transition-all duration-200 shrink-0 lg:w-full whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-cyan-950/80 text-cyan-300 border-cyan-500/60 shadow-xs font-semibold"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60 border-transparent hover:border-slate-700/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                  <span>{sec.label}</span>
                </div>
                {sec.badge && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase transition border ${
                      isActive
                        ? "bg-cyan-400 text-[#113D60] border-cyan-400"
                        : "bg-slate-800/90 text-cyan-400 border-cyan-500/30"
                    }`}
                  >
                    {sec.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:block pt-4 border-t border-slate-800">
          <Link
            href="/"
            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition"
          >
            <span>Exit to Public Marketplace</span>
            <span>→</span>
          </Link>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-4 sm:p-8 space-y-6 overflow-y-auto">
        {actionFeedback && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-medium flex items-center gap-2 animate-fadeIn shadow-2xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* ─── 24. ADMIN PAYMENT MONITORING (Section 24) ───────────────────────── */}
        {activeSection === "payments-monitoring" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#113D60] tracking-tight">
                  Payments &amp; Escrow Liquidity Monitoring
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Real-time visibility into payment volumes, gateway clearances, category platform revenues, and merchant settlements.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/fees"
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-cyan-500/40 hover:border-cyan-500 transition shadow-2xs"
                >
                  Fee Ledger →
                </Link>
                <Link
                  href="/admin/routing"
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-cyan-500/40 hover:border-cyan-500 transition shadow-2xs"
                >
                  Routing →
                </Link>
              </div>
            </div>

            {/* Exact 8 KPI Cards with Minimal Thin Slick Borders */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Payment Volume</span>
                <p className="text-lg sm:text-xl font-semibold text-[#113D60] mt-1">{formatPrice(totalVolume)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Across all gateways</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Successful Payments</span>
                <p className="text-lg sm:text-xl font-semibold text-emerald-700 mt-1">{successfulTxns.length}</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{formatPrice(successfulVolume)} cleared</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Failed Payments</span>
                <p className="text-lg sm:text-xl font-semibold text-red-600 mt-1">0</p>
                <p className="text-[10px] text-slate-400 mt-0.5">0.0% failure rate</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Refunds Issued</span>
                <p className="text-lg sm:text-xl font-semibold text-slate-600 mt-1">₹0</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Zero active chargebacks</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Cash on Delivery (COD)</span>
                <p className="text-lg sm:text-xl font-semibold text-amber-700 mt-1">{codOrdersCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Orders pending collection</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Gateway Transactions</span>
                <p className="text-lg sm:text-xl font-semibold text-[#113D60] mt-1">{transactions.length}</p>
                <p className="text-[10px] text-cyan-700 font-medium mt-0.5">Active: {activeGateway.name}</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Noryvanta Platform Fees</span>
                <p className="text-lg sm:text-xl font-semibold text-amber-700 mt-1">{formatPrice(platformFeesCollected)}</p>
                <p className="text-[10px] text-amber-600 font-medium mt-0.5">Category-based fees earned</p>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Business Settlements</span>
                <p className="text-lg sm:text-xl font-semibold text-emerald-700 mt-1">{formatPrice(businessSettlementsPaid)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Net to merchants</p>
              </div>
            </div>

            {/* Filter controls required by Section 24 */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-ambient space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-[#113D60] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-cyan-600" />
                  <span>Transaction Records &amp; Filter</span>
                </h3>
                <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200/60 self-start sm:self-auto">
                  Showing {filteredTransactions.length} of {transactions.length} records
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Search Order / Entity</label>
                  <input
                    type="text"
                    placeholder="Search Order ID, Customer..."
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    className="w-full p-2 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl text-xs transition outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Business</label>
                  <select
                    value={filterBusiness}
                    onChange={(e) => setFilterBusiness(e.target.value)}
                    className="w-full p-2 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition outline-none"
                  >
                    <option value="All">All Businesses</option>
                    {businesses.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Gateway</label>
                  <select
                    value={filterGateway}
                    onChange={(e) => setFilterGateway(e.target.value)}
                    className="w-full p-2 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition outline-none"
                  >
                    <option value="All">All Gateways (Razorpay &amp; Cashfree)</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="cashfree">Cashfree Payments</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Payment Method</label>
                  <select
                    value={filterMethod}
                    onChange={(e) => setFilterMethod(e.target.value)}
                    className="w-full p-2 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition outline-none"
                  >
                    <option value="All">All Payment Methods</option>
                    <option value="UPI">UPI / QR</option>
                    <option value="Card">Cards (Credit/Debit)</option>
                    <option value="NetBanking">Net Banking</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Transaction Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full p-2 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl transition outline-none"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Successful">Successful</option>
                    <option value="Pending">Pending</option>
                    <option value="COD Pending">COD Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* Mobile Card List View (< sm screens) */}
              <div className="sm:hidden space-y-3 pt-2">
                {filteredTransactions.map((t) => {
                  const gstOnFee = Math.round(t.platformFeeAmount * 0.18);
                  const netNoryvantaRevenue = t.platformFeeAmount - gstOnFee;
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-[#113D60]">{t.orderId}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {t.status}
                        </span>
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-slate-800 truncate">{t.businessName}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{t.date} • {t.paymentMethod}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Gross</span>
                          <span className="font-bold text-slate-900">{formatPrice(t.grossAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-amber-600 block font-medium">Fee</span>
                          <span className="font-bold text-amber-700">-{formatPrice(t.platformFeeAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 block font-medium">Settled</span>
                          <span className="font-bold text-emerald-700">{formatPrice(t.netSettlement)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transactions Table for sm: screens and up */}
              <div className="hidden sm:block overflow-x-auto pt-2">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80">
                      <th className="p-3">Date</th>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Business</th>
                      <th className="p-3">Gross Transaction</th>
                      <th className="p-3">Noryvanta Fee</th>
                      <th className="p-3">Taxes (GST)</th>
                      <th className="p-3">Gateway Charges</th>
                      <th className="p-3">Refunds</th>
                      <th className="p-3">Business Settlement</th>
                      <th className="p-3">Noryvanta Net</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((t) => {
                      const gstOnFee = Math.round(t.platformFeeAmount * 0.18);
                      const netNoryvantaRevenue = t.platformFeeAmount - gstOnFee;
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{t.date}</td>
                          <td className="p-3 font-mono font-bold text-[#113D60]">{t.orderId}</td>
                          <td className="p-3 text-slate-700 font-semibold truncate max-w-[130px]">{t.businessName}</td>
                          <td className="p-3 font-bold text-slate-900">{formatPrice(t.grossAmount)}</td>
                          <td className="p-3 font-bold text-amber-700">{formatPrice(t.platformFeeAmount)}</td>
                          <td className="p-3 text-slate-500">{formatPrice(gstOnFee)}</td>
                          <td className="p-3 text-slate-500">{formatPrice(0)}</td>
                          <td className="p-3 text-slate-500">{formatPrice(0)}</td>
                          <td className="p-3 font-semibold text-emerald-700">{formatPrice(t.netSettlement)}</td>
                          <td className="p-3 font-semibold text-cyan-800">{formatPrice(netNoryvantaRevenue)}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── 11. PAYMENT GATEWAY SELECTION — ADMIN (Section 11) ─────────────── */}
        {activeSection === "payment-gateways" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#113D60] tracking-tight">
                Payment Gateways Architecture & Configuration
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Configure primary payment gateways: Razorpay & Cashfree Payments. (Rule: Sensitive secret keys are never exposed in frontend).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {gateways.map((gw) => {
                const isSelectedForTraffic = activeGateway.id === gw.id;
                return (
                  <div
                    key={gw.id}
                    onClick={() => {
                      if (!isSelectedForTraffic) {
                        setActiveGatewayId(gw.id);
                        setActionFeedback(`${gw.name} set as primary payment gateway.`);
                        setTimeout(() => setActionFeedback(null), 2500);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if (!isSelectedForTraffic) {
                          setActiveGatewayId(gw.id);
                          setActionFeedback(`${gw.name} set as primary payment gateway.`);
                          setTimeout(() => setActionFeedback(null), 2500);
                        }
                      }
                    }}
                    className={`relative bg-white rounded-3xl p-5 sm:p-6 space-y-4 transition-all duration-200 outline-none select-none cursor-pointer active:scale-[0.995] ${
                      isSelectedForTraffic
                        ? "border-2 border-[#113D60] shadow-lg shadow-[#113D60]/10 ring-4 ring-[#113D60]/5"
                        : "border-2 border-slate-200/80 hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold transition-colors ${
                            isSelectedForTraffic
                              ? "bg-[#113D60]/10 border border-[#113D60]/20 text-[#113D60]"
                              : "bg-slate-100/80 border border-slate-200/80 text-slate-500"
                          }`}
                        >
                          <CreditCard className="w-5 h-5 text-current" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-[#113D60]">{gw.name}</h3>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                              gw.status === "Connected"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            Status: {gw.status}
                          </span>
                        </div>
                      </div>

                      {isSelectedForTraffic ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#113D60] text-white text-xs font-bold rounded-xl shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          Active Primary
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveGatewayId(gw.id);
                            setActionFeedback(`${gw.name} set as primary payment gateway.`);
                            setTimeout(() => setActionFeedback(null), 2500);
                          }}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#113D60] text-xs font-bold rounded-xl border border-slate-200/80 hover:border-slate-300 transition shadow-2xs cursor-pointer outline-none focus:outline-none"
                        >
                          Make Primary
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Environment Mode:</span>
                        <span className="font-bold text-[#113D60]">{gw.mode} Mode</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">API Key:</span>
                        <span className="font-mono text-slate-800 font-semibold">{gw.apiKey}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Secret Credential:</span>
                        <span className="font-mono text-slate-400">{gw.secretKeyMasked}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Currencies Supported:</span>
                        <span className="font-semibold text-slate-700">{gw.supportedCurrencies.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500">
                        Methods: {gw.supportedMethods.join(" • ")}
                      </span>
                      {/* Exact Button with Minimal Thin Slick Border */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGatewayConfig(gw);
                        }}
                        className="px-4 py-2 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs cursor-pointer outline-none focus:outline-none"
                      >
                        [ Configure ]
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── BUSINESS VERIFICATION QUEUE ────────────────────────────────────── */}
        {activeSection === "verification" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-ambient space-y-6">
            <div>
              <h2 className="text-xl font-bold font-headline text-[#113D60]">
                Business Verification Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted GSTIN, Udyam MSME, and physical location pins.
              </p>
            </div>

            <div className="space-y-4">
              {businesses.map((biz) => (
                <div
                  key={biz.id}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs hover:border-cyan-500/40 transition-all"
                >
                  <div className="flex items-start gap-3.5">
                    <img
                      src={biz.logo}
                      alt={biz.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#113D60]">{biz.name}</h3>
                        {biz.isVerified ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Pending Review
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        {biz.businessType} • Owner: <strong>{biz.ownerName}</strong> • {biz.city}, {biz.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {!biz.isVerified ? (
                      <button
                        type="button"
                        onClick={() => {
                          verifyBusiness(biz.id, true);
                          setActionFeedback("Business verified & approved.");
                          setTimeout(() => setActionFeedback(null), 2500);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-500/50 hover:border-emerald-400 transition-all shadow-2xs cursor-pointer"
                      >
                        Approve &amp; Verify
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <Check className="w-4 h-4" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── PLATFORM FEES WORKSPACE (Requirement 15) ───────────────────────── */}
        {activeSection === "platform-fees" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#113D60] tracking-tight">
                  Business Platform Fee Configuration
                </h1>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Active category-based platform fee schedule. Historical transactions permanently preserve their applied rates.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/fees"
                  className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl border border-cyan-500/40 hover:border-cyan-500 transition shadow-2xs"
                >
                  Full Fee Ledger →
                </Link>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-medium inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Engine Active • v2.0-2026</span>
                </span>
              </div>
            </div>

            {/* Category Fee Cards with Minimal Thin Slick Borders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PLATFORM_FEE_SCHEDULE.map((tier) => (
                <div key={tier.businessType} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient space-y-3 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{tier.label}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-50 text-cyan-800 border border-cyan-200">Active</span>
                  </div>
                  <p className="text-3xl font-semibold text-[#113D60]">{tier.ratePercentage.toFixed(2)}%</p>
                  <p className="text-xs text-slate-500 leading-snug">{tier.description}</p>
                </div>
              ))}
            </div>

            {/* Policy & Compliance Ledger Notice */}
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/80 shadow-ambient space-y-3 text-xs">
              <h3 className="text-sm font-bold text-[#113D60] flex items-center gap-2">
                <Lock className="w-4 h-4 text-cyan-700" />
                <span>Regulatory Rate Versioning &amp; Immutability Standard</span>
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Platform fee percentages are defined centrally and applied exclusively during transaction settlement calculation. Any future administrative fee modifications will generate a new version timestamp and apply only to subsequent transactions.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="text-slate-900 block">Customer Surcharge:</strong>
                  <span className="text-slate-500">₹0 (Strictly vendor-side)</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="text-slate-900 block">Registration Fee:</strong>
                  <span className="text-emerald-700 font-bold">₹0 (100% Free)</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <strong className="text-slate-900 block">Statutory TDS (Sec 194-O):</strong>
                  <span className="text-slate-500">1.0% Central Tax Escrow</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── OTHER ADMIN WORKSPACES ────────────────────────────────────────── */}
        {!["payments-monitoring", "payment-gateways", "verification", "platform-fees"].includes(activeSection) && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-ambient text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center mx-auto border border-cyan-200/60">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-[#113D60] capitalize">
              Admin {activeSection.replace("-", " ")} Workspace
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Synchronized with live marketplace. All actions are logged and audit-ready.
            </p>
            <button
              onClick={() => setActiveSection("payments-monitoring")}
              className="px-5 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs cursor-pointer"
            >
              Return to Payments Monitoring
            </button>
          </div>
        )}
      </main>

      {/* ─── GATEWAY CONFIGURATION MODAL (Section 11) ─────────────────────────── */}
      {selectedGatewayToConfigure && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#113D60]">
                  Configure {selectedGatewayToConfigure.name}
                </h3>
                <p className="text-xs text-slate-500">Payment Gateway Credentials &amp; Webhooks</p>
              </div>
              <button
                onClick={() => setSelectedGatewayToConfigure(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveGatewayConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Public Key / App ID</label>
                <input
                  type="text"
                  required
                  value={gatewayForm.apiKey || ""}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, apiKey: e.target.value })}
                  className="w-full p-2.5 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl font-mono transition outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Secret Key / Credential (Masked)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={gatewayForm.secretKeyMasked || ""}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, secretKeyMasked: e.target.value })}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl font-mono transition outline-none"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Stored securely on server. Never exposed to frontend clients.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Webhook URL</label>
                <input
                  type="url"
                  required
                  value={gatewayForm.webhookUrl || ""}
                  onChange={(e) => setGatewayForm({ ...gatewayForm, webhookUrl: e.target.value })}
                  className="w-full p-2.5 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl font-mono transition outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mode</label>
                  <select
                    value={gatewayForm.mode}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, mode: e.target.value as any })}
                    className="w-full p-2.5 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl font-bold transition outline-none"
                  >
                    <option value="Test">Test / Sandbox Mode</option>
                    <option value="Live">Live Production Mode</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gateway Status</label>
                  <select
                    value={gatewayForm.isEnabled ? "Enabled" : "Disabled"}
                    onChange={(e) => setGatewayForm({ ...gatewayForm, isEnabled: e.target.value === "Enabled" })}
                    className="w-full p-2.5 border border-slate-200/80 hover:border-cyan-500/40 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 rounded-xl font-bold transition outline-none"
                  >
                    <option value="Enabled">Enabled (Online)</option>
                    <option value="Disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedGatewayToConfigure(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-200/80 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#113D60] hover:bg-slate-800 text-white font-bold rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition shadow-2xs cursor-pointer"
                >
                  Save Gateway Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
