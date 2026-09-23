"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/contexts/I18nContext";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  Search,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Lock,
  Layers,
  CheckCircle2,
  Building2
} from "lucide-react";

export default function HomePage() {
  const { t } = useI18n();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = [
    "All",
    "Industrial Machinery & Automation",
    "Electrical & Electronic Components",
    "Raw Materials & Bulk Chemicals",
    "Commercial B2B Supplies"
  ];

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (searchQuery) params.query = searchQuery;
      const res = await api.get("/products", { params });
      setProducts(res.data);
    } catch (e) {
      console.warn("Could not fetch products from API, using fallback data", e);
      // High-fidelity fallback products matching the Stitch designs
      setProducts([
        {
          id: "prod_1",
          title: "Industrial High-Precision Servo Motor 3KW (IP65 Certified)",
          category: "Industrial Machinery & Automation",
          base_price: 24500,
          moq: 5,
          hsn_code: "850152",
          gst_rate: 18,
          images: ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
          tiered_prices: [
            { min_quantity: 5, unit_price: 24500 },
            { min_quantity: 20, unit_price: 22800 },
            { min_quantity: 100, unit_price: 21000 }
          ]
        },
        {
          id: "prod_2",
          title: "Armored Multicore Control Cable 12-Core 1.5 sq mm (100m Roll)",
          category: "Electrical & Electronic Components",
          base_price: 14200,
          moq: 10,
          hsn_code: "854449",
          gst_rate: 18,
          images: ["https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80"],
          tiered_prices: [
            { min_quantity: 10, unit_price: 14200 },
            { min_quantity: 50, unit_price: 13100 }
          ]
        },
        {
          id: "prod_3",
          title: "Stainless Steel 316L Commercial Flanges 4-Inch ANSI Class 150",
          category: "Raw Materials & Bulk Chemicals",
          base_price: 3850,
          moq: 25,
          hsn_code: "730721",
          gst_rate: 18,
          images: ["https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80"],
          tiered_prices: [
            { min_quantity: 25, unit_price: 3850 },
            { min_quantity: 100, unit_price: 3450 }
          ]
        },
        {
          id: "prod_4",
          title: "Corrugated Heavy-Duty Export Shipping Boxes (Pallet 500 pcs)",
          category: "Commercial B2B Supplies",
          base_price: 42000,
          moq: 1,
          hsn_code: "481910",
          gst_rate: 12,
          images: ["https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80"],
          tiered_prices: [
            { min_quantity: 1, unit_price: 42000 },
            { min_quantity: 5, unit_price: 38500 }
          ]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white to-surface pt-12 pb-20 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-primary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span>{t("hero.badge")}</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-extrabold text-primary tracking-tight leading-tight">
              {t("hero.title")}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
              {t("hero.subtitle")}
            </p>

            {/* Search Box */}
            <form onSubmit={handleSearchSubmit} className="mt-8 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("hero.search_placeholder")}
                  className="w-full pl-11 pr-4 py-3 bg-white border border-border-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition shadow-ambient"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-primary hover:bg-secondary text-white text-sm font-semibold rounded-lg shadow-lifted transition flex items-center justify-center gap-2"
              >
                <span>{t("hero.btn_search")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Escrow assurance badges */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-tertiary" />
                <span>Zero Advance Payment Default</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-secondary" />
                <span>100% GSTIN Tax Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-tertiary" />
                <span>48h Quality Inspection Window</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Metric Statistics */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 bg-white rounded-lg border border-border shadow-ambient text-center">
            <p className="text-2xl sm:text-3xl font-bold font-headline text-primary">{t("stats.gmv")}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{t("stats.gmv_label")}</p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-border shadow-ambient text-center">
            <p className="text-2xl sm:text-3xl font-bold font-headline text-secondary">{t("stats.suppliers")}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{t("stats.suppliers_label")}</p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-border shadow-ambient text-center">
            <p className="text-2xl sm:text-3xl font-bold font-headline text-tertiary">{t("stats.dispute_rate")}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{t("stats.dispute_rate_label")}</p>
          </div>
          <div className="p-6 bg-white rounded-lg border border-border shadow-ambient text-center">
            <p className="text-2xl sm:text-3xl font-bold font-headline text-primary">{t("stats.settlement_time")}</p>
            <p className="text-xs text-slate-500 mt-1 font-medium">{t("stats.settlement_time_label")}</p>
          </div>
        </div>
      </section>

      {/* Category Filter Pills */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">{t("products.title")}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t("products.subtitle")}</p>
          </div>
          <Link
            href="/register"
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-secondary hover:underline"
          >
            <span>Become a Verified Supplier</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? "bg-primary text-white shadow-ambient"
                  : "bg-white border border-border text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-lg border border-border shadow-ambient hover:shadow-lifted transition-all flex flex-col group overflow-hidden"
            >
              {/* Product Image */}
              <div className="relative h-48 bg-slate-100 overflow-hidden">
                <img
                  src={prod.images?.[0] || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"}
                  alt={prod.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-tertiary" />
                  <span>Escrow Verified</span>
                </div>
                <div className="absolute bottom-2.5 right-2.5 bg-primary/80 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono text-white">
                  HSN {prod.hsn_code}
                </div>
              </div>

              {/* Product Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    {prod.category.split("&")[0]}
                  </span>
                  <h3 className="font-semibold text-sm text-primary mt-1 line-clamp-2 leading-snug group-hover:text-secondary transition-colors">
                    {prod.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-bold text-primary font-headline">
                        ₹{Number(prod.base_price).toLocaleString("en-IN")}
                      </span>
                      <span className="text-[11px] text-slate-500 ml-1">/ unit</span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      MOQ: <strong className="text-primary">{prod.moq}</strong>
                    </span>
                  </div>

                  {/* Tiered pricing pill if available */}
                  {prod.tiered_prices && prod.tiered_prices.length > 1 && (
                    <div className="mt-2 text-[11px] bg-slate-50 px-2 py-1 rounded text-slate-600 flex items-center justify-between">
                      <span>Volume Discount:</span>
                      <span className="font-semibold text-emerald-700">Up to 15% off</span>
                    </div>
                  )}

                  <Link
                    href={`/products/${prod.id}`}
                    className="mt-3 w-full py-2 bg-slate-100 hover:bg-primary hover:text-white text-slate-800 text-xs font-semibold rounded text-center transition block"
                  >
                    Order with Escrow Protection
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Showcase Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-primary-container rounded-xl p-8 sm:p-12 text-white relative overflow-hidden shadow-elevated">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/30 text-secondary-container text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-secondary-container" />
              <span>AI Listing & Catalog Digitization</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Digitize Your Wholesale Catalog in Minutes
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Industrial suppliers can now generate complete B2B listings with automated HSN classification, tax slabs, technical attributes, and volume pricing curves using our AI assistant.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Link
                href="/ai-assistant"
                className="px-5 py-2.5 rounded-lg bg-white text-primary hover:bg-slate-100 text-xs font-bold transition shadow-ambient"
              >
                Launch AI Assistant
              </Link>
              <Link
                href="/register"
                className="px-5 py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-white text-xs font-semibold transition"
              >
                Onboard Enterprise Vendor
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
