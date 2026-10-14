"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, HelpCircle, X, CheckCircle2, FileText, Scale } from "lucide-react";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "listing" | "business";
  targetTitle: string;
  targetId: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetTitle,
  targetId
}) => {
  const [reason, setReason] = useState("MISLEADING_INFORMATION");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Report Submitted</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Our Trust & Safety compliance desk has received your ticket for {targetTitle}. We will investigate within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Report {targetType === "listing" ? "Listing" : "Business"}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">Ref: {targetTitle}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Reporting
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                <option value="MISLEADING_INFORMATION">Misleading specifications or imagery</option>
                <option value="PROHIBITED_GOODS">Prohibited or unlicensed goods/services</option>
                <option value="INCORRECT_PRICING">Suspicious or fraudulent pricing</option>
                <option value="IMPERSONATION">Impersonation or invalid GST claims</option>
                <option value="POOR_FULFILLMENT">Unfulfilled order or contact unresponsive</option>
                <option value="OTHER">Other compliance violation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Details / Evidence
              </label>
              <textarea
                required
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Describe why this listing or entity violates Noryvanta marketplace rules..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Noryvanta maintains a zero-tolerance policy against fraudulent listings. Falsified reports are also subject to review.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-sm"
              >
                Submit Report
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const ContactEnquiryModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  listingTitle: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
}> = ({ isOpen, onClose, listingTitle, businessName, businessPhone, businessEmail }) => {
  const [tab, setTab] = useState<"enquiry" | "contact">("enquiry");
  const [enquiryText, setEnquiryText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="flex border-b border-slate-200 gap-4">
            <button
              onClick={() => setTab("enquiry")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                tab === "enquiry"
                  ? "border-[#113D60] text-[#113D60]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Send Direct Enquiry
            </button>
            <button
              onClick={() => setTab("contact")}
              className={`pb-2.5 text-xs font-bold border-b-2 transition ${
                tab === "contact"
                  ? "border-[#113D60] text-[#113D60]"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Direct Business Details
            </button>
          </div>
        </div>

        {tab === "contact" ? (
          <div className="space-y-4 py-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">{businessName}</h4>
              <p className="text-xs text-slate-500 mt-0.5">Regarding: {listingTitle}</p>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Business Phone:</span>
                <a href={`tel:${businessPhone}`} className="font-bold text-[#113D60] hover:text-blue-600">
                  {businessPhone}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Official Email:</span>
                <a href={`mailto:${businessEmail}`} className="font-bold text-[#113D60] hover:text-blue-600">
                  {businessEmail}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Instant Messaging:</span>
                <a
                  href={`https://wa.me/91${businessPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-emerald-600 hover:underline"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              For buyer escrow protection and formal tax invoicing, all orders should be completed through noryvantaglobal.com.
            </p>
          </div>
        ) : submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Enquiry Dispatched!</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your inquiry has been sent to {businessName}. They will contact you shortly via SMS and phone.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <p className="text-xs text-slate-500">Inquiry for:</p>
              <h4 className="text-sm font-bold text-slate-900">{listingTitle}</h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Quantity / Units
                </label>
                <input
                  type="text"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 5 units or 50 kg"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Your Phone / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Requirement Note
              </label>
              <textarea
                required
                rows={3}
                value={enquiryText}
                onChange={(e) => setEnquiryText(e.target.value)}
                placeholder="Specify delivery destination, target timeline, or custom specifications..."
                className="w-full p-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#113D60] hover:bg-slate-800 rounded-lg transition shadow-sm"
              >
                Send Enquiry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
