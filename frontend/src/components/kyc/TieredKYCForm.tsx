"use client";

import React, { useState } from "react";
import {
  User,
  Store,
  Users,
  Building,
  Wrench,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Info,
  Lock,
  ArrowRight,
  Eye,
  CreditCard,
  Building2
} from "lucide-react";

export type AccountCategory =
  | "INDIVIDUAL_CUSTOMER"
  | "SOLE_PROPRIETOR"
  | "PARTNERSHIP"
  | "COMPANY_LLP"
  | "REGISTERED_SERVICE_PROVIDER"
  | "SKILLED_HOME_SERVICE_PROVIDER";

export type LegalStructure =
  | "INDIVIDUAL"
  | "SOLE_PROPRIETOR"
  | "PARTNERSHIP"
  | "COMPANY_LLP";

export default function TieredKYCForm() {
  const [selectedType, setSelectedType] = useState<AccountCategory>("INDIVIDUAL_CUSTOMER");
  const [selectedStructure, setSelectedStructure] = useState<LegalStructure>("SOLE_PROPRIETOR");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: "Anita Sharma",
    phone: "+91 98765 43210",
    email: "anita@example.com",
    idType: "AADHAAR",
    idNumber: "987654321234",
    panNumber: "ABCDE1234F",
    ckycId: "CKYC-88992211",
    businessName: "Sharma Enterprises",
    businessDocType: "SHOP_ESTABLISHMENT",
    businessDocNumber: "MH-MUM-2025-00129",
    cinNumber: "U12345MH2025PTC998877",
    authorizedPersonName: "Anita Sharma",
    authorizedPersonDesignation: "Director",
    beneficialOwnerName: "Rahul Sharma",
    beneficialOwnerShare: "35%",
    bankHolderName: "Sharma Enterprises",
    bankName: "HDFC Bank",
    accountNumber: "50100234567812",
    ifsc: "HDFC0001234",
    gstin: "27ABCDE1234F1ZX"
  });

  const accountTypes = [
    {
      id: "INDIVIDUAL_CUSTOMER" as AccountCategory,
      title: "Individual Customer",
      subtitle: "Personal shopping & discovery",
      icon: User,
      badge: "Light Onboarding"
    },
    {
      id: "SOLE_PROPRIETOR" as AccountCategory,
      title: "Sole Proprietor",
      subtitle: "Proprietor CDD + Activity proof",
      icon: Store,
      badge: "No Forced GST"
    },
    {
      id: "PARTNERSHIP" as AccountCategory,
      title: "Partnership Firm",
      subtitle: "Deed + Partner & Beneficial CDD",
      icon: Users,
      badge: "Firm & Partners"
    },
    {
      id: "COMPANY_LLP" as AccountCategory,
      title: "LLP / Company",
      subtitle: "CIN/LLPIN + Authorized CDD",
      icon: Building,
      badge: "Entity CDD"
    },
    {
      id: "REGISTERED_SERVICE_PROVIDER" as AccountCategory,
      title: "Registered Service Provider",
      subtitle: "Services with chosen legal structure",
      icon: Wrench,
      badge: "Configurable Structure"
    },
    {
      id: "SKILLED_HOME_SERVICE_PROVIDER" as AccountCategory,
      title: "Skilled Home Provider",
      subtitle: "Small-scale artisan / home service",
      icon: Sparkles,
      badge: "GST Exempt"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] text-white p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-xs uppercase tracking-wider font-bold text-[#D4AF37]">
                Noryvanta Tiered KYC Engine
              </span>
            </div>
            <h2 className="text-xl font-bold font-headline">Risk-Based & Data-Minimized KYC</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              We collect only the minimum documents necessary for your specific legal structure and risk tier. No bloated universal forms.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 text-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-slate-200">RBI CDD Compliant & Masked Storage</span>
          </div>
        </div>
      </div>

      {/* Account Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-900 font-headline">
          Step 1: What type of account are you registering?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {accountTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setSelectedType(type.id);
                  setSubmitted(false);
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "bg-[#D4AF37]/10 border-[#D4AF37] ring-2 ring-[#D4AF37]/20 shadow-sm"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-700"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected ? "bg-[#D4AF37] text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {type.badge}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900">{type.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{type.subtitle}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-selector for Registered Service Provider */}
      {selectedType === "REGISTERED_SERVICE_PROVIDER" && (
        <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
          <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider">
            What is your service business legal structure?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "INDIVIDUAL" as LegalStructure, label: "Individual Freelancer" },
              { id: "SOLE_PROPRIETOR" as LegalStructure, label: "Sole Proprietorship" },
              { id: "PARTNERSHIP" as LegalStructure, label: "Partnership Firm" },
              { id: "COMPANY_LLP" as LegalStructure, label: "LLP / Pvt Ltd" }
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStructure(st.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold border text-center transition-all ${
                  selectedStructure === st.id
                    ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                    : "bg-white text-slate-700 border-amber-300 hover:bg-amber-100/50"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-amber-800 flex items-center gap-1.5 mt-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            KYC fields dynamically adjust based on your selected legal structure. No unnecessary documentation.
          </p>
        </div>
      )}

      {/* Dynamic KYC Fields Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-headline">
              Step 2: Required KYC Information
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dynamically filtered for: <span className="font-semibold text-slate-800">{selectedType.replace(/_/g, " ")}</span>
            </p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
            Purpose: Verification Layer
          </span>
        </div>

        {/* 1. INDIVIDUAL IDENTITY KYC */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#D4AF37]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Individual Identity Verification
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Identity Document Type</label>
              <select
                value={formData.idType}
                onChange={(e) => setFormData({ ...formData, idType: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                <option value="AADHAAR">Aadhaar (OVD / DigiLocker / Proof of Possession)</option>
                <option value="PASSPORT">Passport</option>
                <option value="VOTER_ID">Voter Identity Card</option>
                <option value="DRIVING_LICENSE">Driving License</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Number</label>
              <input
                type="text"
                value={formData.idNumber}
                onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Masked in UI as: XXXX XXXX 1234</p>
            </div>
          </div>
        </div>

        {/* 2. CKYC / KYC IDENTIFIER */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. CKYC Identifier / KYC Identifier (Optional / Reusable)
              </h4>
            </div>
            <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Reusable KYC Reference
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CKYC Identifier / KYC Identifier</label>
              <input
                type="text"
                value={formData.ckycId}
                onChange={(e) => setFormData({ ...formData, ckycId: e.target.value })}
                placeholder="14-digit CKYC Identifier if available"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
            <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <Info className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              Existing CKYC records can be retrieved automatically without duplicate document uploads.
            </div>
          </div>
        </div>

        {/* 3. BUSINESS / ENTITY CDD (IF APPLICABLE) */}
        {selectedType !== "INDIVIDUAL_CUSTOMER" && selectedType !== "SKILLED_HOME_SERVICE_PROVIDER" && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Business / Entity Verification
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Legal Business Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  required
                />
              </div>

              {selectedType === "SOLE_PROPRIETOR" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Business/Activity Proof Document</label>
                    <select
                      value={formData.businessDocType}
                      onChange={(e) => setFormData({ ...formData, businessDocType: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    >
                      <option value="SHOP_ESTABLISHMENT">Shop & Establishment Certificate</option>
                      <option value="UDYAM_MSME">Udyam / MSME Certificate</option>
                      <option value="TRADE_LICENSE">Trade License</option>
                      <option value="BUSINESS_REGISTRATION">Other Business Registration</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Reference Number</label>
                    <input
                      type="text"
                      value={formData.businessDocNumber}
                      onChange={(e) => setFormData({ ...formData, businessDocNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </>
              )}

              {selectedType === "COMPANY_LLP" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">CIN / LLPIN</label>
                    <input
                      type="text"
                      value={formData.cinNumber}
                      onChange={(e) => setFormData({ ...formData, cinNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Incorporation Document</label>
                    <button type="button" className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5" /> Upload Certificate of Incorporation
                    </button>
                  </div>
                </>
              )}

              {selectedType === "PARTNERSHIP" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Partnership Deed</label>
                    <button type="button" className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50">
                      <Upload className="w-3.5 h-3.5" /> Upload Partnership Deed
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Registration Reference (if registered)</label>
                    <input
                      type="text"
                      placeholder="Registrar of Firms ref"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* AUTHORIZED PERSON & BENEFICIAL OWNER CDD FOR PARTNERSHIP / COMPANY */}
            {(selectedType === "PARTNERSHIP" || selectedType === "COMPANY_LLP") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-2">Authorized Representative / Signatory</h5>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.authorizedPersonName}
                      placeholder="Full Legal Name"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={formData.authorizedPersonDesignation}
                      placeholder="Designation (Partner, Director)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      Only authorized signatories are requested for CDD — unrelated employees are never asked.
                    </p>
                  </div>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 mb-2">Beneficial Owner CDD (&gt;10% / 15% Ownership)</h5>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={formData.beneficialOwnerName}
                      placeholder="Beneficial Owner Name"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      value={formData.beneficialOwnerShare}
                      placeholder="Ownership % (e.g. 25%)"
                      className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <p className="text-[10px] text-slate-500">
                      Mandated by RBI CDD guidelines for legal entities.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. TAX IDENTIFIERS (DATA MINIMIZED) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                {selectedType === "INDIVIDUAL_CUSTOMER" || selectedType === "SKILLED_HOME_SERVICE_PROVIDER"
                  ? "4. Tax Information (Minimal / As Applicable)"
                  : "4. Business Tax KYC (PAN / GSTIN)"}
              </h4>
            </div>
            {selectedType === "SKILLED_HOME_SERVICE_PROVIDER" && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md">
                GST EXEMPT (Never Demanded)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {selectedType === "COMPANY_LLP" ? "Entity PAN" : selectedType === "PARTNERSHIP" ? "Firm PAN" : "PAN"}
              </label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                placeholder="XXXXX1234X"
              />
              <p className="text-[10px] text-slate-400 mt-1">Masked in UI as: XXXXX1234X</p>
            </div>

            {selectedType !== "INDIVIDUAL_CUSTOMER" && selectedType !== "SKILLED_HOME_SERVICE_PROVIDER" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (if turnover threshold applies)</label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  placeholder="27XXXXX1234X1ZX"
                />
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Info className="w-4 h-4 text-emerald-600 mr-2 shrink-0" />
                <span>
                  <strong>Zero GST Demand:</strong> GSTIN is completely exempted for individual customers and skilled home service providers.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. BANK ACCOUNT VERIFICATION (PURPOSE DRIVEN) */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-teal-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                5. Bank Account Verification
              </h4>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              selectedType === "INDIVIDUAL_CUSTOMER" || selectedType === "SKILLED_HOME_SERVICE_PROVIDER"
                ? "bg-slate-100 border-slate-200 text-slate-600"
                : "bg-blue-50 border-blue-200 text-blue-700"
            }`}>
              {selectedType === "INDIVIDUAL_CUSTOMER" || selectedType === "SKILLED_HOME_SERVICE_PROVIDER"
                ? "Status: NOT_REQUIRED"
                : "Required for Merchant Settlements"}
            </span>
          </div>

          {selectedType === "INDIVIDUAL_CUSTOMER" ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">Bank Verification is Not Required for Shopping</p>
              <p className="text-[11px] text-slate-500">
                Bank details are only requested if you initiate a refund workflow requiring direct account credit.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankHolderName}
                  onChange={(e) => setFormData({ ...formData, bankHolderName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
                <p className="text-[10px] text-slate-400 mt-1">Masked as: XXXXXXXX7812</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={formData.ifsc}
                  onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>
          )}

          {/* CRITICAL REGULATORY DISCLAIMER */}
          <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Non-Withdrawable Digital Reward Credit Invariant:</p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Bank-account verification is an ownership and settlement layer. It does <strong>not</strong> create a right to withdraw Noryvanta digital reward credits as cash. Platform rewards are digital repurchase credits governed by separate platform rules.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Immutable audit event will be logged upon submission.
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#B38728] text-slate-900 font-bold text-xs rounded-xl shadow hover:brightness-105 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Submit Tiered Verification"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {submitted && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">KYC Submitted Successfully under {selectedType.replace(/_/g, " ")} Tier</p>
              <p className="text-[11px] text-emerald-700">
                Verification status: <strong>SUBMITTED</strong>. Decoupled Identity, Business, and Tax events recorded in audit log.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
