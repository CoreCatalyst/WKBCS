"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import { ContactEnquiryModal, ReportModal } from "@/components/trust/TrustModals";
import {
  Building2,
  MapPin,
  ShieldCheck,
  Star,
  Phone,
  Mail,
  Edit,
  ArrowRight,
  Package,
  Briefcase,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2
} from "lucide-react";

export default function PublicBusinessProfilePage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const { businesses, listings, updateBusiness } = useMarketplace();
  const { formatPrice } = useCountry();

  const business = businesses.find((b) => b.id === businessId) || businesses[0];
  const businessListings = listings.filter((l) => l.businessId === business?.id || l.businessName === business?.name);

  const [activeTab, setActiveTab] = useState<"Products" | "Services" | "About" | "Reviews">("Products");
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: business?.name || "",
    description: business?.description || "",
    ownerName: business?.ownerName || "",
    phone: business?.phone || "",
    email: business?.email || ""
  });

  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  if (!business) {
    return <div className="p-12 text-center text-xs text-slate-500">Business Profile Not Found</div>;
  }

  const handleSaveEdit = () => {
    updateBusiness(business.id, editFormData);
    setIsEditMode(false);
  };

  const productListings = businessListings.filter((l) => l.type === "Product");
  const serviceListings = businessListings.filter((l) => l.type === "Service");

  return (
    <div className="bg-slate-50 min-h-screen py-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link href="/businesses" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[#113D60]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Businesses</span>
          </Link>

          {/* Owner can toggle edit profile */}
          <button
            type="button"
            onClick={() => setIsEditMode(!isEditMode)}
            className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5 text-cyan-600" />
            <span>{isEditMode ? "Cancel Editing" : "Edit Profile (Owner)"}</span>
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Banner */}
          <div className="h-44 bg-gradient-to-r from-[#113D60] via-[#102040] to-cyan-900 relative">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>

          <div className="px-6 sm:px-10 pb-8 -mt-16 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <img
                src={business.logo}
                alt={business.name}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-lg bg-white shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] tracking-tight">
                    {business.name}
                  </h1>
                  {business.isVerified && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Business
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {business.businessType} • {business.category} • Operated by <strong className="text-slate-800">{business.ownerName}</strong>
                </p>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{business.address}, {business.city}, {business.state} - {business.pinCode}</span>
                </p>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsContactOpen(true)}
                className="px-5 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-400" />
                <span>Contact Business</span>
              </button>

              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition"
                title="Report Business"
              >
                <AlertTriangle className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Edit Mode Form (If Owner Toggles) */}
        {isEditMode && (
          <div className="bg-white rounded-3xl border border-cyan-300 p-6 sm:p-8 space-y-4 shadow-lifted">
            <h3 className="text-base font-bold text-[#113D60]">Edit Public Profile Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Shop Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Name</label>
                <input
                  type="text"
                  value={editFormData.ownerName}
                  onChange={(e) => setEditFormData({ ...editFormData, ownerName: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditMode(false)}
                className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-[#113D60] text-white text-xs font-bold rounded-xl"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Tab Navigation: Products, Services, About & Location, Reviews */}
        <div className="bg-white p-1 rounded-2xl border border-slate-200 flex max-w-lg">
          {(["Products", "Services", "About", "Reviews"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === tab
                  ? "bg-[#113D60] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ─── TAB: PRODUCTS ─────────────────────────────────────────────────── */}
        {activeTab === "Products" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#113D60]">
              Products Offered ({productListings.length})
            </h3>
            {productListings.length === 0 ? (
              <p className="text-xs text-slate-500">No physical products listed by this business yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {productListings.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-lifted transition flex flex-col justify-between">
                    <div>
                      <div className="h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
                      <p className="text-sm font-semibold text-[#113D60] mt-1">{formatPrice(item.price)}</p>
                    </div>
                    <Link
                      href={`/products/${item.id}`}
                      className="mt-3 w-full py-2 bg-slate-50 hover:bg-[#113D60] text-slate-800 hover:text-white border border-slate-200 text-xs font-medium rounded-xl transition text-center"
                    >
                      View Product
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: SERVICES ─────────────────────────────────────────────────── */}
        {activeTab === "Services" && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-[#113D60]">
              Commercial Services ({serviceListings.length})
            </h3>
            {serviceListings.length === 0 ? (
              <p className="text-xs text-slate-500">No contracted services listed by this business yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {serviceListings.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-lifted transition flex flex-col justify-between">
                    <div>
                      <div className="h-44 rounded-xl overflow-hidden bg-slate-100 mb-3">
                        <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 line-clamp-1">{item.title}</h4>
                      <p className="text-sm font-semibold text-[#113D60] mt-1">{formatPrice(item.price)} / {item.unit}</p>
                    </div>
                    <Link
                      href={`/products/${item.id}`}
                      className="mt-3 w-full py-2 bg-slate-50 hover:bg-[#113D60] text-slate-800 hover:text-white border border-slate-200 text-xs font-medium rounded-xl transition text-center"
                    >
                      View Service
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: ABOUT & LOCATION ─────────────────────────────────────────── */}
        {activeTab === "About" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-[#113D60]">Company Description</h3>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {business.description}
              </p>

              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                {business.gstNumber && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">GSTIN:</span>
                    <span className="font-bold text-slate-800">{business.gstNumber}</span>
                  </div>
                )}
                {business.udyamRegistration && (
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">MSME Udyam:</span>
                    <span className="font-bold text-slate-800">{business.udyamRegistration}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">GST Registration Status:</span>
                  <span className="font-semibold text-emerald-700">{business.gstStatus}</span>
                </div>
              </div>
            </div>

            {/* Pinned Map Location */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-4">
              <h3 className="text-sm font-bold text-[#113D60] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-600" />
                <span>Pinned Location ({business.lat}° N, {business.lng}° E)</span>
              </h3>
              <div className="h-48 bg-slate-100 rounded-2xl border border-slate-200 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px]" />
                <div className="relative text-center p-4">
                  <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center mx-auto shadow-md mb-2">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">{business.name}</p>
                  <p className="text-[10px] text-slate-500">{business.address}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: REVIEWS ──────────────────────────────────────────────────── */}
        {activeTab === "Reviews" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#113D60]">Customer Feedback</h3>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>{business.rating} ({business.reviewsCount} verified reviews)</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Apex Industrial Buyer</span>
                <span className="text-slate-400 font-normal">Verified Escrow Order</span>
              </div>
              <p className="text-slate-600">
                Smooth interaction, transparent invoicing with GST claim credit, and prompt dispatch. Recommended.
              </p>
            </div>
          </div>
        )}
      </div>

      <ContactEnquiryModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        listingTitle={`Direct Inquiry: ${business.name}`}
        businessName={business.name}
        businessPhone={business.phone}
        businessEmail={business.email}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        targetType="business"
        targetTitle={business.name}
        targetId={business.id}
      />
    </div>
  );
}
