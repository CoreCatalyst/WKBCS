"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import {
  fetchMarketplaceFeatured,
  fetchMarketplaceCategories,
  MarketplaceListing,
  MarketplaceCategory
} from "@/lib/api";
import {
  Search,
  MapPin,
  ShieldCheck,
  Building2,
  ArrowRight,
  ShoppingCart,
  CalendarCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Star,
  Cpu,
  Apple,
  Shirt,
  Home,
  Briefcase,
  HardHat,
  Car,
  Factory,
  GraduationCap,
  Stethoscope,
  Boxes,
  Percent,
  Compass,
  ArrowUpRight,
  Check,
  HelpCircle
} from "lucide-react";

// Icon mapping for the 12 categories
const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  Cpu,
  Apple,
  Shirt,
  Home,
  Briefcase,
  HardHat,
  Building2,
  Car,
  Factory,
  GraduationCap,
  Stethoscope,
  Boxes,
};

// 3D icon image mapping for all 12 categories
const CATEGORY_3D_ICON_MAP: Record<string, string> = {
  Electronics: "/categories/electronics.jpg",
  electronics: "/categories/electronics.jpg",
  "Food & Grocery": "/categories/food-grocery.jpg",
  "food-grocery": "/categories/food-grocery.jpg",
  Fashion: "/categories/fashion.jpg",
  fashion: "/categories/fashion.jpg",
  "Home Services": "/categories/home-services.jpg",
  "home-services": "/categories/home-services.jpg",
  "Professional Services": "/categories/professional-services.jpg",
  "professional-services": "/categories/professional-services.jpg",
  Construction: "/categories/construction.jpg",
  construction: "/categories/construction.jpg",
  "Real Estate": "/categories/real-estate.jpg",
  "real-estate": "/categories/real-estate.jpg",
  Automotive: "/categories/automotive.jpg",
  automotive: "/categories/automotive.jpg",
  Manufacturing: "/categories/manufacturing.jpg",
  manufacturing: "/categories/manufacturing.jpg",
  Education: "/categories/education.jpg",
  education: "/categories/education.jpg",
  "Healthcare Services": "/categories/healthcare.jpg",
  "healthcare-services": "/categories/healthcare.jpg",
  Healthcare: "/categories/healthcare.jpg",
  healthcare: "/categories/healthcare.jpg",
  Other: "/categories/other.jpg",
  other: "/categories/other.jpg",
};

const INDIAN_CITIES = [
  "All India",
  "Bengaluru, KA",
  "Mumbai, MH",
  "Delhi NCR",
  "Hyderabad, TS",
  "Chennai, TN",
  "Pune, MH",
  "Kolkata, WB",
  "Ahmedabad, GJ",
  "Jaipur, RJ"
];

export default function HomePage() {
  const router = useRouter();
  const { categories: fallbackCategories, listings: fallbackListings, businesses } = useMarketplace();
  const { country, formatPrice } = useCountry();

  // Search state
  const [searchTab, setSearchTab] = useState<"Product" | "Service" | "Business" | "Category" | "Location">("Product");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("All India");
  const [activeListingTab, setActiveListingTab] = useState<"All" | "Product" | "Service">("All");
  const [subFilter, setSubFilter] = useState<string>("All");

  // Live Backend Data States
  const [liveCategories, setLiveCategories] = useState<MarketplaceCategory[]>([]);
  const [liveFeatured, setLiveFeatured] = useState<{ products: MarketplaceListing[]; services: MarketplaceListing[] }>({
    products: [],
    services: []
  });
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [cartToast, setCartToast] = useState<string | null>(null);

  // Fetch live marketplace data from FastAPI backend
  useEffect(() => {
    let isMounted = true;
    async function loadMarketplace() {
      try {
        const [catsRes, featRes] = await Promise.allSettled([
          fetchMarketplaceCategories(),
          fetchMarketplaceFeatured()
        ]);
        if (isMounted) {
          if (catsRes.status === "fulfilled" && catsRes.value.length > 0) {
            setLiveCategories(catsRes.value);
          }
          if (featRes.status === "fulfilled" && (featRes.value.products.length > 0 || featRes.value.services.length > 0)) {
            setLiveFeatured(featRes.value);
          }
        }
      } catch (err) {
        console.warn("Using offline marketplace fallback:", err);
      } finally {
        if (isMounted) setIsLoadingApi(false);
      }
    }
    loadMarketplace();
    return () => { isMounted = false; };
  }, []);

  const handleAddToCart = (title: string) => {
    setCartToast(`Added "${title}" to your cart.`);
    setTimeout(() => setCartToast(null), 3200);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTab === "Business") {
      router.push(`/businesses?q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(selectedCity)}`);
    } else {
      router.push(`/products?type=${searchTab}&q=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(selectedCity)}`);
    }
  };

  // Determine active listings from live backend API or fallback
  const hasLiveListings = liveFeatured.products.length > 0 || liveFeatured.services.length > 0;

  const displayListings = useMemo(() => {
    if (hasLiveListings) {
      let pool: Array<{
        id: string;
        type: "Product" | "Service";
        title: string;
        shortDescription: string;
        category: string;
        price: number;
        unit: string;
        moq: number;
        availability: string;
        images: string[];
        businessName: string;
        businessType: string;
        businessCity: string;
        businessState: string;
        businessVerified: boolean;
        rating: number;
      }> = [];

      const mapLive = (item: MarketplaceListing) => ({
        id: item.id,
        type: (item.type === "SERVICE" ? "Service" : "Product") as "Product" | "Service",
        title: item.title,
        shortDescription: item.short_description || item.description?.slice(0, 150) || "",
        category: item.category,
        price: item.base_price,
        unit: item.unit,
        moq: item.moq,
        availability: item.availability,
        images: item.images && item.images.length > 0 ? item.images : ["https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"],
        businessName: item.merchant?.trade_name || "Verified Enterprise",
        businessType: item.merchant?.business_type || "Vendor",
        businessCity: item.merchant?.city || "Mumbai",
        businessState: item.merchant?.state || "MH",
        businessVerified: item.merchant?.is_verified ?? true,
        rating: item.merchant?.rating || 4.9
      });

      if (activeListingTab === "All") {
        pool = [...liveFeatured.products.map(mapLive), ...liveFeatured.services.map(mapLive)];
      } else if (activeListingTab === "Product") {
        let p = liveFeatured.products.map(mapLive);
        if (subFilter !== "All") {
          p = p.filter(item => item.businessType.toLowerCase().includes(subFilter.toLowerCase()));
        }
        pool = p;
      } else if (activeListingTab === "Service") {
        let s = liveFeatured.services.map(mapLive);
        if (subFilter !== "All") {
          s = s.filter(item => item.businessType.toLowerCase().includes(subFilter.toLowerCase()));
        }
        pool = s;
      }
      return pool;
    }

    // Context fallback
    return fallbackListings
      .filter(item => {
        if (activeListingTab === "All") return item.status === "Published";
        if (item.type !== activeListingTab || item.status !== "Published") return false;
        if (subFilter !== "All") {
          const bType = item.businessType || businesses.find(b => b.id === item.businessId)?.businessType || "";
          return bType.toLowerCase().includes(subFilter.toLowerCase());
        }
        return true;
      })
      .map(item => {
        const bType = item.businessType || businesses.find(b => b.id === item.businessId)?.businessType || "Wholesaler";
        return {
          id: item.id,
          type: item.type,
          title: item.title,
          shortDescription: item.shortDescription,
          category: item.category,
          price: item.price,
          unit: item.unit,
          moq: item.moq || 1,
          availability: item.availability,
          images: item.images,
          businessName: item.businessName,
          businessType: bType,
          businessCity: item.businessCity,
          businessState: item.businessState,
          businessVerified: item.businessVerified,
          rating: 4.9
        };
      })
      .slice(0, 9);
  }, [hasLiveListings, liveFeatured, activeListingTab, subFilter, fallbackListings, businesses]);

  // Keep previous existing canonical category cards according to category
  const displayCategories = fallbackCategories;


  return (
    <div className="bg-slate-50 text-slate-800 space-y-20 pb-20">
      {/* ─── Hero Section with Clean White & Professional Navy Palette ───────────── */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-12 pb-20">
        {/* Subtle Ambient Mesh Glow */}
        <div className="absolute top-0 right-1/4 w-[600px] h-[300px] bg-cyan-100/30 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[250px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none -z-0" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Trust Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100/90 border border-slate-200/90 text-xs font-medium text-slate-700 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>India&apos;s Trusted Business Marketplace Platform</span>
              <span className="text-slate-300">•</span>
              <span className="text-cyan-700 font-semibold">Noryvanta - Global</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#113D60] leading-[1.15]">
              Discover Businesses, Products &amp; Services on{" "}
              <span className="bg-gradient-to-r from-blue-700 via-cyan-600 to-[#113D60] bg-clip-text text-transparent">
                Noryvanta - Global
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              Connect with trusted businesses, discover products and services, and transact through one powerful platform.
            </p>

            {/* Prominent Search Bar */}
            <div className="pt-2 max-w-3xl mx-auto">
              {/* Search By Filter Tabs */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mr-2 hidden sm:inline">
                  Search by:
                </span>
                {(["Product", "Service", "Business", "Category", "Location"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSearchTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      searchTab === tab
                        ? "bg-[#113D60] text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Main Search Bar Form */}
              <form
                onSubmit={handleSearchSubmit}
                className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-lifted flex flex-col md:flex-row gap-2 items-center"
              >
                {/* Search Input */}
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      searchTab === "Product"
                        ? "What product are you looking for? (e.g. Servo Motors, Spices, Silk Sarees)"
                        : searchTab === "Service"
                        ? "What service do you need? (e.g. Warehouse Construction, Corporate Diagnostics)"
                        : searchTab === "Business"
                        ? "Search business or shop name (e.g. Apex Precision, Kaveri Organics)"
                        : searchTab === "Category"
                        ? "Type a category (e.g. Manufacturing, Electronics, Fashion)"
                        : "Search by PIN code or locality..."
                    }
                    className="w-full pl-12 pr-4 py-3 bg-transparent text-slate-900 placeholder-slate-400 text-[15px] focus:outline-none"
                  />
                </div>

                {/* Location Picker */}
                <div className="relative w-full md:w-52 border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                    <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="bg-transparent text-xs font-medium text-slate-700 w-full focus:outline-none cursor-pointer"
                    >
                      {INDIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full md:w-auto px-7 py-3 bg-[#113D60] hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition shadow-xs flex items-center justify-center gap-2 shrink-0 border border-cyan-500/40 cursor-pointer"
                >
                  <span>Search</span>
                  <ArrowRight className="w-4 h-4 text-cyan-400" />
                </button>
              </form>
            </div>

            {/* CTAs */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/products"
                className="px-6 py-3 bg-[#113D60] hover:bg-slate-800 text-white text-sm font-medium rounded-xl shadow-xs transition flex items-center gap-2 border border-cyan-500/40 hover:border-cyan-400"
              >
                <span>Explore Products &amp; Services</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 bg-white hover:bg-slate-50 text-[#113D60] border border-slate-300 text-sm font-medium rounded-xl transition flex items-center gap-2 shadow-2xs"
              >
                <Building2 className="w-4 h-4 text-cyan-600" />
                <span>Register Your Business</span>
              </Link>
            </div>

            {/* Key Trust Signals */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-normal">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Secure Transaction Escrow</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                <span>GST Verified Businesses</span>
              </div>
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-600" />
                <span>Transparent Business Fee (from 3.20%) • Zero Buyer Surcharge</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Marketplace Category Cards (All 12 Specified Categories) ───────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-700">
              <Compass className="w-4 h-4" />
              <span>Explore Marketplace</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#113D60] mt-1">
              Browse by Category
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Connect with specialized suppliers, manufacturers, contractors and local stores across India.
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 shrink-0"
          >
            <span>View All Categories</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayCategories.map((cat) => {
            const icon3dUrl = CATEGORY_3D_ICON_MAP[cat.name] || (cat.slug && CATEGORY_3D_ICON_MAP[cat.slug]) || "/categories/other.jpg";
            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group p-4 bg-white rounded-2xl border border-slate-200/90 shadow-ambient hover:shadow-lifted hover:border-cyan-500/50 transition-all flex flex-col items-center text-center justify-between"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 border border-slate-200/80 p-1 flex items-center justify-center overflow-hidden group-hover:scale-105 group-hover:border-cyan-400 group-hover:shadow-md transition-all duration-300">
                  <img
                    src={icon3dUrl}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-xl shadow-inner group-hover:contrast-105 transition"
                    loading="lazy"
                  />
                </div>
                <div className="mt-3">
                  <h3 className="text-xs font-semibold text-slate-900 group-hover:text-cyan-700 leading-snug">
                    {cat.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-normal mt-0.5">
                    {cat.listingCount}+ listings
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Featured Products & Services Showcase (Live Marketplace APIs) ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                Verified Active Marketplace Listings
              </span>
              {isLoadingApi && (
                <span className="text-[11px] font-normal text-slate-400 animate-pulse">
                  Syncing with Noryvanta Engine...
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#113D60] mt-2 tracking-tight">
              Featured Products & Services
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Curated listings with minimum 4 verified images, clear pricing, and verified merchant credentials.
            </p>
          </div>

          {/* Primary Type Toggle: All | Products | Services */}
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-xs self-start sm:self-auto">
            {(["All", "Product", "Service"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveListingTab(tab);
                  setSubFilter("All");
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                  activeListingTab === tab
                    ? "bg-[#113D60] text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab === "All" ? "All Listings" : `${tab}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Sub-Filter Row for Granular Merchant & Service Types */}
        {activeListingTab === "Product" && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider shrink-0">
              Merchant Tier:
            </span>
            {[
              { id: "All", label: "All Products" },
              { id: "Wholesaler", label: "Wholesalers" },
              { id: "Distributor", label: "Distributors" },
              { id: "Retailer", label: "Retailers" }
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubFilter(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                  subFilter === sub.id
                    ? "bg-cyan-700 text-white font-semibold shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {activeListingTab === "Service" && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider shrink-0">
              Provider Category:
            </span>
            {[
              { id: "All", label: "All Services" },
              { id: "Registered Service Provider", label: "Registered Service Providers" },
              { id: "Skilled Small-Scale Home Service Provider", label: "Skilled Home Services" }
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setSubFilter(sub.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition ${
                  subFilter === sub.id
                    ? "bg-purple-700 text-white font-semibold shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Active Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayListings.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-ambient hover:shadow-elevated transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Product/Service Imagery with Photo Count & Type Badges */}
                <div className="h-56 bg-slate-100 relative overflow-hidden">
                  <img
                    src={item.images[0] || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"}
                    alt={item.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80";
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Type Badge & Verified Merchant Badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase shadow-xs border ${
                        item.type === "Service"
                          ? "bg-purple-50 text-purple-900 border-purple-200"
                          : "bg-cyan-50 text-cyan-900 border-cyan-200"
                      }`}
                    >
                      {item.type}
                    </span>
                    {item.businessVerified && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified Merchant
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                    {item.images.length} Photos
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span className="font-medium text-cyan-700">{item.category}</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {item.businessCity}, {item.businessState}
                    </span>
                  </div>

                  <h3 className="font-semibold text-base text-slate-900 leading-snug line-clamp-2 group-hover:text-cyan-700 transition">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {item.shortDescription}
                  </p>

                  {/* Public Merchant Attribution (Strictly protects private financials) */}
                  <div className="mt-2.5 text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.businessName}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-cyan-700 font-medium">{item.businessType}</span>
                  </div>

                  <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400 font-medium uppercase">Pricing</p>
                      <p className="text-lg font-semibold text-[#113D60]">
                        {formatPrice(item.price)}
                        <span className="text-xs font-normal text-slate-500 ml-1">/ {item.unit}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      {item.moq > 1 ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          MOQ: {item.moq}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {item.availability}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Add to Cart + Buy Now / Book Service */}
              <div className="px-5 pb-5 pt-0 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleAddToCart(item.title)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Add to Cart</span>
                </button>
                <Link
                  href={`/products/${item.id}`}
                  className="w-full py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {item.type === "Service" ? (
                    <>
                      <CalendarCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Book Service</span>
                    </>
                  ) : (
                    <>
                      <span>Buy Now</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    </>
                  )}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Floating Add to Cart Toast Notification */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#113D60] text-white px-5 py-3 rounded-2xl shadow-2xl border border-cyan-500/40 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-xs font-medium">
            {cartToast}
          </div>
        </div>
      )}


      {/* ─── Featured Verified Businesses Section ─────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-blue-700">
              Verified Marketplace Profiles
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#113D60] mt-1 tracking-tight">
              Top Rated Verified Businesses
            </h2>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Companies, shops, wholesalers and service specialists with verified statutory credentials.
            </p>
          </div>
          <Link
            href="/businesses"
            className="text-xs font-medium text-cyan-700 hover:text-cyan-900 flex items-center gap-1 shrink-0"
          >
            <span>View All Businesses</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {businesses.slice(0, 3).map((biz) => (
            <div
              key={biz.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-ambient p-6 flex flex-col justify-between hover:shadow-lifted transition"
            >
              <div>
                <div className="flex items-start gap-4">
                  <img
                    src={biz.logo}
                    alt={biz.name}
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-base text-slate-900 leading-snug">
                        {biz.name}
                      </h3>
                      {biz.isVerified && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-normal mt-1">
                      {biz.businessType} • {biz.category}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {biz.city}, {biz.state}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3.5 line-clamp-3 leading-relaxed">
                  {biz.description}
                </p>

                {biz.gstNumber && (
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-600 flex justify-between">
                    <span>GSTIN:</span>
                    <span className="font-medium text-slate-800">{biz.gstNumber}</span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-semibold text-slate-800">{biz.rating}</span>
                  <span className="text-xs text-slate-400">({biz.reviewsCount} reviews)</span>
                </div>
                <Link
                  href={`/businesses/${biz.id}`}
                  className="text-xs font-medium text-[#113D60] hover:text-cyan-700 flex items-center gap-1"
                >
                  <span>View Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


