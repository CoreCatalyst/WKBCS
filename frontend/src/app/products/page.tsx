"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { ShieldCheck, Search, Filter, ArrowRight } from "lucide-react";

export default function ProductsCatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
      const res = await api.get("/products", { params });
      setProducts(res.data);
    } catch (e) {
      console.warn("Using fallback products", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-secondary uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4 text-tertiary" />
          <span>Verified B2B Commercial Catalogs</span>
        </div>
        <h1 className="text-3xl font-bold font-headline text-primary mt-1">
          Wholesale Products & Verified Manufacturers
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Direct factory pricing with transparent tiered volume discounts and mandatory escrow protection.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? "bg-primary text-white shadow-ambient"
                : "bg-white border border-border text-slate-700 hover:bg-slate-50"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-xl border border-border shadow-ambient hover:shadow-lifted transition overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="h-52 bg-slate-100 relative overflow-hidden">
                <img
                  src={prod.images?.[0] || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"}
                  alt={prod.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-white/95 px-2.5 py-1 rounded text-xs font-bold text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
                  <span>Escrow Guaranteed</span>
                </div>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>{prod.category}</span>
                  <span className="font-mono font-semibold">HSN {prod.hsn_code}</span>
                </div>
                <h3 className="font-bold text-base text-primary leading-snug">
                  {prod.title}
                </h3>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>

                {/* Bulk Tier Summary */}
                {prod.tiered_prices && prod.tiered_prices.length > 0 && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Volume Discounts</span>
                    {prod.tiered_prices.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs text-slate-700">
                        <span>{t.min_quantity}{t.max_quantity ? ` - ${t.max_quantity}` : "+"} units:</span>
                        <strong className="text-primary font-headline">₹{t.unit_price.toLocaleString("en-IN")}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 pt-0 border-t border-slate-100 mt-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-xl font-bold font-headline text-primary">₹{prod.base_price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-slate-500"> / unit</span>
                </div>
                <span className="text-xs text-slate-500">MOQ: <strong>{prod.moq}</strong></span>
              </div>
              <Link
                href={`/products/${prod.id}`}
                className="w-full mt-2 py-2.5 bg-primary hover:bg-secondary text-white text-xs font-bold rounded-lg text-center transition flex items-center justify-center gap-2"
              >
                <span>Order with Escrow</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
