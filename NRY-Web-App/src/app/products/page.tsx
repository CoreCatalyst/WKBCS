"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import { BUSINESS_TYPES } from "@/lib/marketplaceData";
import {
  Search,
  Filter,
  MapPin,
  ShieldCheck,
  Star,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  Check,
  Building2,
  ChevronDown
} from "lucide-react";

const CITIES = [
  "All Cities",
  "Bengaluru",
  "Mumbai",
  "Delhi NCR",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Mysuru",
  "Kanchipuram"
];

function ProductsCatalogContent() {
  const searchParams = useSearchParams();

  const initialCategory = searchParams.get("category") || "All";
  const initialType = searchParams.get("type") || "All";
  const initialQuery = searchParams.get("q") || "";
  const initialCity = searchParams.get("city") || "All Cities";

  const { listings, categories } = useMarketplace();
  const { country, formatPrice } = useCountry();

  // Search & Filter State required by Section 14
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [selectedCity, setSelectedCity] = useState(initialCity.includes("All") ? "All Cities" : initialCity);
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>("All");
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(2000000);
  const [availabilityOnly, setAvailabilityOnly] = useState<boolean>(false);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Filter computation
  const filteredListings = listings.filter((item) => {
    // Status must be published
    if (item.status !== "Published") return false;

    // Search query: search by product/company name, city, or speciality
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        item.title?.toLowerCase().includes(q) ||
        item.shortDescription?.toLowerCase().includes(q) ||
        item.detailedDescription?.toLowerCase().includes(q) ||
        item.businessName?.toLowerCase().includes(q) ||
        item.businessCity?.toLowerCase().includes(q) ||
        item.businessState?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q) ||
        item.businessType?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q)) ||
        Object.values(item.specifications || {}).some((v) => v.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Category filter
    if (selectedCategory !== "All" && item.category !== selectedCategory) {
      return false;
    }

    // Product vs Service filter
    if (selectedType !== "All" && item.type !== selectedType) {
      return false;
    }

    // Location filter
    if (selectedCity !== "All Cities") {
      if (!item.businessCity.toLowerCase().includes(selectedCity.toLowerCase())) {
        return false;
      }
    }

    // Supplier business type filter
    if (selectedBusinessType !== "All") {
      if (item.businessType && !item.businessType.toLowerCase().includes(selectedBusinessType.toLowerCase())) {
        return false;
      }
    }

    // Price filter
    if (item.price > maxPrice) {
      return false;
    }

    // Availability filter
    if (availabilityOnly && item.availability === "Temporarily Unavailable") {
      return false;
    }

    // Verified business filter
    if (verifiedOnly && !item.businessVerified) {
      return false;
    }

    return true;
  });

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSelectedType("All");
    setSelectedCity("All Cities");
    setSelectedBusinessType("All");
    setMinRating(0);
    setMaxPrice(2000000);
    setAvailabilityOnly(false);
    setVerifiedOnly(false);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-cyan-700">
              <Search className="w-4 h-4" />
              <span>Search & Discovery</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] mt-1 tracking-tight">
              Explore Products & Services
            </h1>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Filter by verified manufacturers, service providers, price ranges, and Indian commercial districts.
            </p>
          </div>

          <button
            onClick={handleResetFilters}
            className="self-start sm:self-auto text-xs font-medium text-slate-500 hover:text-[#113D60] flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>

        {/* ─── FILTERS & SEARCH BAR (Section 14) ──────────────────────────────── */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          {/* Top row: Search query & Type toggle */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-8 relative">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-cyan-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products or services by company name, city, or speciality..."
                className="w-full pl-10 pr-4 py-2.5 text-[14px] bg-white text-slate-800 placeholder-slate-400 border border-cyan-500/40 hover:border-cyan-500 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all shadow-2xs outline-none font-medium"
              />
            </div>

            <div className="md:col-span-4 flex p-1 rounded-xl border border-cyan-500/40 bg-slate-50">
              {(["All", "Product", "Service"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    selectedType === t
                      ? "bg-[#113D60] text-white shadow-xs font-semibold"
                      : "text-slate-600 hover:text-cyan-700 hover:bg-white"
                  }`}
                >
                  {t === "All" ? "All Types" : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Second row: Category, Location, Business Type dropdowns with slick thin colored borders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer appearance-none bg-white pr-9 border shadow-2xs outline-none ${
                    selectedCategory !== "All"
                      ? "border-cyan-600 bg-cyan-50/50 text-cyan-950 font-semibold ring-1 ring-cyan-500/30"
                      : "border-cyan-500/50 hover:border-cyan-600 text-slate-700 hover:text-[#113D60] focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  }`}
                >
                  <option value="All">All 12 Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-cyan-600 pointer-events-none absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Location
              </label>
              <div className="relative">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer appearance-none bg-white pr-9 border shadow-2xs outline-none ${
                    selectedCity !== "All Cities"
                      ? "border-cyan-600 bg-cyan-50/50 text-cyan-950 font-semibold ring-1 ring-cyan-500/30"
                      : "border-cyan-500/50 hover:border-cyan-600 text-slate-700 hover:text-[#113D60] focus:border-cyan-600 focus:ring-2 focus:ring-cyan-500/20"
                  }`}
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-cyan-600 pointer-events-none absolute right-3 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
                Supplier Business Type
              </label>
              <div className="relative">
                <select
                  value={selectedBusinessType}
                  onChange={(e) => setSelectedBusinessType(e.target.value)}
                  className={`w-full px-3.5 py-2.5 text-xs font-medium rounded-xl transition-all duration-200 cursor-pointer appearance-none bg-white pr-9 border shadow-2xs outline-none ${
                    selectedBusinessType !== "All"
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
          </div>

          {/* Third row: Quick Checkboxes */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60]"
                />
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verified Businesses Only</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={availabilityOnly}
                  onChange={(e) => setAvailabilityOnly(e.target.checked)}
                  className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60]"
                />
                <span>In Stock / Immediately Active Only</span>
              </label>
            </div>

            <div className="text-slate-400 font-normal">
              Showing <strong className="text-slate-800 font-semibold">{filteredListings.length}</strong> verified results
            </div>
          </div>
        </div>

        {/* ─── SEARCH RESULTS GRID (Section 14 Modern Cards) ──────────────────── */}
        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <p className="text-base font-semibold text-[#113D60]">No listings found matching your search</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your category, removing filters, or resetting your search query.
            </p>
            <button
              onClick={handleResetFilters}
              className="px-5 py-2.5 bg-[#113D60] text-white text-xs font-medium rounded-xl"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-lifted transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div>
                  {/* Card Image */}
                  <div className="h-52 bg-slate-100 relative overflow-hidden">
                    <img
                      src={item.images[item.primaryImageIndex] || item.images[0]}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 flex gap-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-white/95 text-[#113D60] shadow-xs">
                        {item.type}
                      </span>
                      {item.businessVerified && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    {/* Category & Rating */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-cyan-700">{item.category}</span>
                      <div className="flex items-center gap-1 font-semibold text-slate-800">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>4.8</span>
                      </div>
                    </div>

                    {/* Product/Service Name */}
                    <h3 className="font-semibold text-base text-[#113D60] leading-snug line-clamp-2 group-hover:text-cyan-700 transition">
                      {item.title}
                    </h3>

                    {/* Business Name */}
                    <p className="text-xs font-normal text-slate-700 flex items-center gap-1.5 pt-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{item.businessName}</span>
                    </p>

                    {/* Location */}
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{item.businessCity}, {item.businessState}</span>
                    </p>

                    {/* Price */}
                    <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                      <div>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">Price</span>
                        <p className="text-lg font-semibold text-[#113D60]">
                          {formatPrice(item.price)}
                          <span className="text-xs font-normal text-slate-500 ml-1">/ {item.unit}</span>
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {item.availability}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Details Button */}
                <div className="p-5 pt-0">
                  <Link
                    href={`/products/${item.id}`}
                    className="w-full py-2.5 bg-slate-50 hover:bg-[#113D60] text-slate-800 hover:text-white border border-slate-200 hover:border-[#113D60] text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <span>View Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsCatalogPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Marketplace...</div>}>
      <ProductsCatalogContent />
    </Suspense>
  );
}
