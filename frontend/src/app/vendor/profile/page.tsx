"use client";

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2, Shield, FileText, TrendingUp, Star, ChevronRight,
  Package, Users, CheckCircle2, Clock, ArrowUpRight, AlertCircle,
  Upload, Camera, Edit2, MapPin, Globe, Phone, Mail
} from "lucide-react";
import TieredKYCForm from "@/components/kyc/TieredKYCForm";

const VENDOR_PROFILE = {
  company_name: "SafetyPro Manufacturing Pvt. Ltd.",
  gstin: "29ABCDE1234F1Z5",
  pan: "ABCDE1234F",
  msme_udyam: "UDYAM-KA-09-0012345",
  iec_code: "IEC0012345",
  verified: true,
  rating: 4.7,
  reviews: 312,
  category: "Industrial Safety Equipment",
  since: "2016",
  city: "Bengaluru",
  state: "Karnataka",
  website: "https://safetypro-mfg.in",
  phone: "+91-80-4123-5678",
  email: "export@safetypro-mfg.in",
  description: "ISO 9001:2015 certified manufacturer of industrial personal protective equipment (PPE). 100% export-ready with CE & BIS certification. Supplying across 22 Indian states and 14 export markets.",
  total_orders: 1247,
  active_products: 86,
  fulfillment_rate: 98.2,
  avg_delivery_days: 7.3,
  badges: ["GST Verified", "MSME Certified", "ISO 9001", "BIS Approved"],
  documents: [
    { name: "GST Registration Certificate", status: "VERIFIED", uploaded: "2023-01-15" },
    { name: "MSME Udyam Certificate", status: "VERIFIED", uploaded: "2023-01-16" },
    { name: "ISO 9001:2015 Certificate", status: "VERIFIED", uploaded: "2023-03-10" },
    { name: "IEC Export Certificate", status: "PENDING", uploaded: "2026-09-20" },
    { name: "Factory License", status: "VERIFIED", uploaded: "2022-12-01" },
  ],
  bank_details: {
    account_name: "SafetyPro Manufacturing Pvt. Ltd.",
    account_number: "XXXX XXXX 4821",
    ifsc: "HDFC0001234",
    bank: "HDFC Bank",
    branch: "Koramangala, Bengaluru"
  }
};

const TABS = ["Profile", "KYC & Documents", "Analytics", "Bank Account", "Settings"];

export default function VendorProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Profile");
  const [editMode, setEditMode] = useState(false);

  const st = VENDOR_PROFILE;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#1D4ED8]" />
        <div className="px-6 pb-6 -mt-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-[#1E3A8A]">
              SP
            </div>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold font-headline text-[#0F172A]">{st.company_name}</h1>
                {st.verified && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{st.city}, {st.state}</span>
                <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{st.rating} ({st.reviews} reviews)</span>
                <span>Member since {st.since}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="flex items-center gap-2 px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Edit2 className="w-3.5 h-3.5" />
            {editMode ? "Cancel Edit" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: st.total_orders.toLocaleString(), icon: Package, color: "text-[#1E3A8A]", bg: "bg-blue-50" },
          { label: "Active Products", value: st.active_products, icon: Building2, color: "text-[#10B981]", bg: "bg-emerald-50" },
          { label: "Fulfilment Rate", value: `${st.fulfillment_rate}%`, icon: TrendingUp, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Avg. Delivery", value: `${st.avg_delivery_days} days`, icon: Clock, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-5 space-y-3">
              <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                <Icon className={`w-4.5 h-4.5 ${item.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold font-headline text-[#0F172A]">{item.value}</p>
                <p className="text-[11px] text-slate-500">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E2E8F0] flex gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition border-b-2 ${
              activeTab === tab
                ? "border-[#1E3A8A] text-[#1E3A8A]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "Profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5">
            <h2 className="text-base font-bold text-[#0F172A] font-headline">Business Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "GSTIN", value: st.gstin },
                { label: "PAN", value: st.pan },
                { label: "MSME Udyam", value: st.msme_udyam },
                { label: "IEC Code", value: st.iec_code },
                { label: "Category", value: st.category },
                { label: "City", value: `${st.city}, ${st.state}` },
              ].map(({ label, value }) => (
                <div key={label} className="space-y-1">
                  <label className="text-[11px] text-slate-500 font-medium">{label}</label>
                  {editMode ? (
                    <input
                      defaultValue={value}
                      className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
                    />
                  ) : (
                    <p className="text-xs font-semibold text-[#0F172A] font-mono">{value}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-medium">Company Description</label>
              {editMode ? (
                <textarea
                  rows={3}
                  defaultValue={st.description}
                  className="w-full px-3 py-2 border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20 resize-none"
                />
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed">{st.description}</p>
              )}
            </div>
            {editMode && (
              <button className="px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-lg hover:bg-[#1E3A8A] transition">
                Save Changes
              </button>
            )}
          </div>
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#0F172A]">Contact Details</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600"><Globe className="w-3.5 h-3.5" /><a href={st.website} className="text-[#1D4ED8] hover:underline">{st.website}</a></div>
                <div className="flex items-center gap-2 text-slate-600"><Phone className="w-3.5 h-3.5" />{st.phone}</div>
                <div className="flex items-center gap-2 text-slate-600"><Mail className="w-3.5 h-3.5" />{st.email}</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#0F172A]">Badges & Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {st.badges.map(b => (
                  <span key={b} className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-semibold rounded-lg flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />{b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "KYC & Documents" && (
        <div className="space-y-6">
          <TieredKYCForm />
        </div>
      )}

      {activeTab === "Analytics" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 text-center text-slate-400 py-20">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">Advanced Analytics Dashboard</p>
          <p className="text-xs mt-1">Revenue trends, order velocity, repeat buyer rates, and export breakdown charts available here.</p>
        </div>
      )}

      {activeTab === "Bank Account" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 space-y-5 max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F172A] font-headline">Bank Account for Escrow Disbursement</h2>
            <Shield className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
            {Object.entries(st.bank_details).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}</span>
                <span className="font-mono font-bold text-[#0F172A]">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            Account verified via penny drop by Noryvanta Escrow Operations.
          </p>
          <button className="px-4 py-2 border border-[#CBD5E1] rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Update Bank Details
          </button>
        </div>
      )}

      {activeTab === "Settings" && (
        <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-6 text-slate-400 text-center py-16 text-sm">
          Account settings — notification preferences, API keys, and 2FA configuration.
        </div>
      )}
    </div>
  );
}
