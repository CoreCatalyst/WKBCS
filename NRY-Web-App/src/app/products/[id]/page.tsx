"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import { ContactEnquiryModal, ReportModal } from "@/components/trust/TrustModals";
import {
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Building2,
  ArrowRight,
  Phone,
  MessageSquare,
  AlertTriangle,
  Star,
  Check,
  Share2,
  Heart,
  HelpCircle,
  Truck,
  RotateCcw,
  Sparkles,
  Play,
  Film
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const { listings, businesses } = useMarketplace();
  const { formatPrice } = useCountry();

  // Find the target listing or fallback
  const listing = listings.find((l) => l.id === productId) || listings[0];
  const business = businesses.find((b) => b.id === listing.businessId) || businesses[0];

  const [selectedImageIdx, setSelectedImageIdx] = useState(listing.primaryImageIndex || 0);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Modals state
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // When listing changes, sync selected image index
  useEffect(() => {
    if (listing) {
      setSelectedImageIdx(listing.primaryImageIndex || 0);
      setActiveVideoUrl(null);
    }
  }, [listing]);

  if (!listing) {
    return <div className="p-12 text-center text-xs text-slate-500">Loading listing details...</div>;
  }

  // Related products
  const relatedListings = listings
    .filter((l) => l.category === listing.category && l.id !== listing.id)
    .slice(0, 3);

  const handleBuyNow = () => {
    router.push(`/checkout?productId=${listing.id}&quantity=${quantity}&price=${listing.price}`);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-[#113D60] transition">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[#113D60] transition">Explore</Link>
          <span>/</span>
          <Link href={`/products?category=${encodeURIComponent(listing.category)}`} className="hover:text-[#113D60] transition">
            {listing.category}
          </Link>
          <span>/</span>
          <span className="text-[#113D60] font-bold truncate max-w-xs">{listing.title}</span>
        </div>

        {/* Top Product Hero (Left Gallery, Right Details) */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ─── LEFT: LARGE IMAGE GALLERY (Section 10) ───────────────────────── */}
          <div className="lg:col-span-7 space-y-4">
            {/* Main Stage Media (Image or Video) */}
            <div className="relative h-[380px] sm:h-[460px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 group flex items-center justify-center">
              {activeVideoUrl ? (
                <video
                  src={activeVideoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <img
                  src={listing.images[selectedImageIdx] || listing.images[0]}
                  alt={listing.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}

              <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
                <span className="px-3 py-1 rounded-md text-xs font-semibold uppercase tracking-wider bg-white/95 text-[#113D60] shadow-sm">
                  {listing.type}
                </span>
                {listing.businessVerified && (
                  <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Supplier
                  </span>
                )}
              </div>

              <div className="absolute bottom-4 right-4 bg-black/75 backdrop-blur-xs text-white text-xs font-medium px-3 py-1 rounded-lg pointer-events-none">
                {activeVideoUrl ? "Product Video Clip" : `Photo ${selectedImageIdx + 1} of ${listing.images.length}`}
              </div>
            </div>

            {/* Thumbnail Carousel (4-10 images & optional video clips) */}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {listing.images.map((imgUrl, idx) => (
                <button
                  key={`img-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveVideoUrl(null);
                    setSelectedImageIdx(idx);
                  }}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition ${
                    !activeVideoUrl && selectedImageIdx === idx
                      ? "border-cyan-500 ring-2 ring-cyan-200 scale-95"
                      : "border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}

              {listing.videos && listing.videos.map((vidUrl, vIdx) => (
                <button
                  key={`vid-${vIdx}`}
                  type="button"
                  onClick={() => setActiveVideoUrl(vidUrl)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition relative bg-slate-900 flex items-center justify-center ${
                    activeVideoUrl === vidUrl
                      ? "border-cyan-500 ring-2 ring-cyan-200 scale-95"
                      : "border-slate-200 hover:border-slate-300 opacity-85 hover:opacity-100"
                  }`}
                  title={`Play Product Video Clip ${vIdx + 1}`}
                >
                  <video src={vidUrl} className="w-full h-full object-cover opacity-60" />
                  <div className="absolute w-8 h-8 rounded-full bg-cyan-600/90 text-white flex items-center justify-center shadow">
                    <Play className="w-4 h-4 ml-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ─── RIGHT: PRODUCT SPECIFICATIONS & CTAS (Section 10) ────────────── */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category & Verified Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-md">
                  {listing.category}
                </span>

                <button
                  onClick={() => setIsReportOpen(true)}
                  className="text-[11px] font-medium text-slate-400 hover:text-red-600 flex items-center gap-1 transition"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>Report</span>
                </button>
              </div>

              {/* Product/Service Name */}
              <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] leading-tight tracking-tight">
                {listing.title}
              </h1>

              {/* Business Name & Location */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#113D60]">
                    <Building2 className="w-5 h-5 text-cyan-700" />
                  </div>
                  <div>
                    <Link
                      href={`/businesses/${business.id}`}
                      className="text-xs font-bold text-[#113D60] hover:text-cyan-700 transition flex items-center gap-1"
                    >
                      <span>{business.name}</span>
                      {business.isVerified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </Link>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{listing.businessCity}, {listing.businessState}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{business.rating}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">({business.reviewsCount} reviews)</span>
                </div>
              </div>

              {/* Price & Availability */}
              <div className="pt-2 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Price (Excl. 18% GST)
                  </span>
                  <p className="text-3xl font-semibold text-[#113D60]">
                    {formatPrice(listing.price)}
                    <span className="text-xs font-normal text-slate-500 ml-1.5">/ {listing.unit}</span>
                  </p>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-medium">
                    {listing.availability}
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <p className="text-xs text-slate-600 leading-relaxed pt-1">
                {listing.shortDescription}
              </p>

              {/* Key Features */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-medium text-slate-700 uppercase tracking-wider">
                  Key Specifications:
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {listing.keyFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quantity Picker */}
              <div className="pt-3 flex items-center gap-3">
                <span className="text-xs font-medium text-slate-700">Quantity:</span>
                <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-200"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-mono font-medium text-[#113D60]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1.5 text-xs font-medium hover:bg-slate-200"
                  >
                    +
                  </button>
                </div>
                <span className="text-xs text-slate-400">Total: {formatPrice(listing.price * quantity)}</span>
              </div>
            </div>

            {/* Exact Action Buttons from Section 10: "Buy Now", "Contact Business", "Send Enquiry" */}
            <div className="pt-6 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={handleBuyNow}
                className="w-full py-3.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-ambient flex items-center justify-center gap-2"
              >
                <span>Buy Now (Escrow Secured)</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsContactOpen(true)}
                  className="w-full py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Contact Business</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsContactOpen(true)}
                  className="w-full py-2.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-900 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Send Enquiry</span>
                </button>
              </div>

              {/* Escrow Guarantee Notice */}
              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Noryvanta Escrow: Funds released to merchant only after successful delivery.</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── BELOW: DETAILED DESCRIPTION, SPECS, BUSINESS INFO, REVIEWS (Section 10) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Detailed Description */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-3 shadow-sm">
              <h3 className="text-base font-bold text-[#113D60] border-b border-slate-100 pb-3">
                Detailed Description
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {listing.detailedDescription}
              </p>
            </div>

            {/* Specifications Table */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
              <h3 className="text-base font-bold text-[#113D60] border-b border-slate-100 pb-3">
                Technical Specifications & Standards
              </h3>
              <div className="overflow-hidden border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(listing.specifications).map(([key, val]) => (
                      <tr key={key} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-semibold text-slate-500 w-1/3 bg-slate-50">{key}</td>
                        <td className="p-3 text-slate-800 font-medium">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-[#113D60]">Customer Reviews & Ratings</h3>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>{business.rating} out of 5.0</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">Precision Engineering Corp.</span>
                    <span className="text-slate-400">2 weeks ago</span>
                  </div>
                  <div className="flex gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />
                    ))}
                  </div>
                  <p className="text-xs text-slate-600">
                    Exceptional manufacturing tolerances and fast dispatch. The product matched all documented CAD drawings accurately. Escrow release went smoothly.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Information Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h3 className="text-sm font-bold text-[#113D60] border-b border-slate-100 pb-3">
                Merchant Information
              </h3>

              <div className="flex items-center gap-3">
                <img
                  src={business.logo}
                  alt={business.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{business.name}</h4>
                  <p className="text-[11px] text-slate-500">{business.businessType} • {business.category}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                {business.description}
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="font-semibold text-slate-700">{business.city}, {business.state}</span>
                </div>
                {business.gstNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">GSTIN:</span>
                    <span className="font-mono font-bold text-slate-800">{business.gstNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed Orders:</span>
                  <span className="font-bold text-emerald-700">{business.totalTransactions}+</span>
                </div>
              </div>

              <Link
                href={`/businesses/${business.id}`}
                className="w-full py-2.5 bg-slate-50 hover:bg-[#113D60] text-slate-700 hover:text-white border border-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <span>View Full Business Profile</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Platform Guarantee Card */}
            <div className="bg-gradient-to-br from-cyan-950 to-[#113D60] text-white p-6 rounded-3xl space-y-3 shadow-lg">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm">Noryvanta Buyer Protection</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every purchase made through Noryvanta is protected by RBI-compliant milestone escrow. Your funds are only released to the supplier once you approve the dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* ─── RELATED PRODUCTS & SERVICES ────────────────────────────────────── */}
        {relatedListings.length > 0 && (
          <div className="space-y-6 pt-6">
            <h3 className="text-xl font-bold font-headline text-[#113D60]">
              Related Products & Services in {listing.category}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedListings.map((rel) => (
                <Link
                  key={rel.id}
                  href={`/products/${rel.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-lifted transition flex flex-col justify-between group"
                >
                  <div className="h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                    <img
                      src={rel.images[0]}
                      alt={rel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 line-clamp-1 group-hover:text-cyan-700 transition">
                      {rel.title}
                    </h4>
                    <p className="text-sm font-semibold text-[#113D60] mt-1">
                      {formatPrice(rel.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ContactEnquiryModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        listingTitle={listing.title}
        businessName={business.name}
        businessPhone={business.phone}
        businessEmail={business.email}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="listing"
        targetTitle={listing.title}
        targetId={listing.id}
      />
    </div>
  );
}
