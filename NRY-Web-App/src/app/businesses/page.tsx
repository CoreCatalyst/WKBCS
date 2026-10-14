"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { BUSINESS_TYPES, BusinessType } from "@/lib/marketplaceData";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Star,
  Search,
  Filter,
  ArrowRight,
  Sliders,
  CheckCircle2,
  ChevronDown
} from "lucide-react";

function BusinessesDirectoryContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialCity = searchParams.get("city") || "All India";

  const { businesses, categories, listings } = useMarketplace();

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState<string>("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const filteredBusinesses = businesses.filter((biz) => {
    if (query.trim()) {
      const q = query.toLowerCase().trim();
      const bizListings = listings?.filter((l) => l.businessId === biz.id) || [];
      const matchesSpeciality =
        biz.category?.toLowerCase().includes(q) ||
        biz.description?.toLowerCase().includes(q) ||
        bizListings.some((l) =>
          l.title?.toLowerCase().includes(q) ||
          l.shortDescription?.toLowerCase().includes(q) ||
          l.keywords?.some((k) => k.toLowerCase().includes(q))
        );
      const matchesName =
        biz.name?.toLowerCase().includes(q) ||
        biz.tradeName?.toLowerCase().includes(q) ||
        biz.ownerName?.toLowerCase().includes(q);
      const matchesCity =
        biz.city?.toLowerCase().includes(q) ||
        biz.district?.toLowerCase().includes(q) ||
        biz.state?.toLowerCase().includes(q);

      if (!matchesName && !matchesCity && !matchesSpeciality) {
        return false;
      }
    }
    if (selectedCategory !== "All" && biz.category !== selectedCategory) {
      return false;
    }
    if (selectedType !== "All" && biz.businessType !== selectedType) {
      return false;
    }
    if (verifiedOnly && !biz.isVerified) {
      return false;
    }
    return true;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan-700">
            <Building2 className="w-4 h-4" />
            <span>Marketplace Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] mt-1 tracking-tight">
            Registered Businesses, Manufacturers & Shops
          </h1>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Connect directly with verified Indian manufacturers, service providers, distributors and local retail stores.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-6 relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-cyan-600" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search business by company name, city or speciality..."
                className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-white text-slate-800 placeholder-slate-400 border border-cyan-500/40 hover:border-cyan-500 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all shadow-2xs outline-none font-medium"
              />
            </div>

            <div className="md:col-span-3 relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer appearance-none bg-white pr-9 border shadow-2xs outline-none ${
                  selectedCategory !== "All"
                    ? "border-cyan-600 bg-cyan-50/50 text-cyan-950 font-semibold ring-1 ring-cyan-500/30"
                    : "border-cyan-500/50 hover:border-cyan-600 text-slate-700 hover:text-[#113D60] focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                }`}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-cyan-600 pointer-events-none absolute right-3 top-3.5" />
            </div>

            <div className="md:col-span-3 relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer appearance-none bg-white pr-9 border shadow-2xs outline-none ${
                  selectedType !== "All"
                    ? "border-cyan-600 bg-cyan-50/50 text-cyan-950 font-semibold ring-1 ring-cyan-500/30"
                    : "border-cyan-500/50 hover:border-cyan-600 text-slate-700 hover:text-[#113D60] focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                }`}
              >
                <option value="All">All Business Types</option>
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-cyan-600 pointer-events-none absolute right-3 top-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60]"
              />
              <span>Show Verified Businesses Only</span>
            </label>

            <span className="text-slate-400 font-normal">
              Found <strong className="text-slate-800 font-semibold">{filteredBusinesses.length}</strong> businesses
            </span>
          </div>
        </div>

        {/* Business Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBusinesses.map((biz) => (
            <div
              key={biz.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-lifted transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4">
                  <img
                    src={biz.logo}
                    alt={biz.name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-base text-[#113D60] leading-tight">
                        {biz.name}
                      </h3>
                      {biz.isVerified && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-cyan-700 mt-1">
                      {biz.businessType} • {biz.category}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {biz.city}, {biz.state}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3.5 line-clamp-3 leading-relaxed">
                  {biz.description}
                </p>

                {biz.gstNumber ? (
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 flex justify-between font-mono">
                    <span>GSTIN:</span>
                    <span className="font-medium text-slate-800">{biz.gstNumber}</span>
                  </div>
                ) : (
                  <div className="mt-3 p-2 bg-slate-50 rounded-xl text-[11px] text-slate-400 flex justify-between">
                    <span>GST Status:</span>
                    <span>{biz.gstStatus}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-slate-800">{biz.rating}</span>
                  <span className="text-xs text-slate-400">({biz.reviewsCount} reviews)</span>
                </div>
                <Link
                  href={`/businesses/${biz.id}`}
                  className="px-4 py-2 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition flex items-center gap-1"
                >
                  <span>View Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BusinessesDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Directory...</div>}>
      <BusinessesDirectoryContent />
    </Suspense>
  );
}
