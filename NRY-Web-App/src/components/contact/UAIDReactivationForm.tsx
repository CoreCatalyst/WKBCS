"use client";

import React, { useState, useId, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  FileDown,
  ArrowRight,
  Info,
  Calendar,
  User,
  Building2,
  Mail,
  Phone,
  HelpCircle,
  RotateCcw
} from "lucide-react";

export interface UAIDReactivationFormProps {
  onSuccessClose?: () => void;
  standalone?: boolean;
}

const BUSINESS_MIN_PURCHASE: Record<string, number> = {
  Wholesaler: 100000,
  Wholeseller: 100000,
  Distributor: 10000,
  Retailer: 5000,
  "Service Provider": 5000,
  "Customer/User": 5000,
};

export const UAIDReactivationForm: React.FC<UAIDReactivationFormProps> = ({
  onSuccessClose,
  standalone = false,
}) => {
  // Generate random default application reference for initial load
  const initialAppNumber = useMemo(
    () => `APP-2026-UAID-${Math.floor(1000 + Math.random() * 9000)}`,
    []
  );

  const todayStr = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day} / ${month} / ${year}`;
  }, []);

  // Form State
  const [applicationNumber, setApplicationNumber] = useState(initialAppNumber);
  const [filingDate, setFilingDate] = useState(todayStr);
  const [reactivationType, setReactivationType] = useState<string>("Retailer");

  // Account Information
  const [applicantName, setApplicantName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [uaid, setUaid] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("India");
  const [stateProvince, setStateProvince] = useState("");
  const [districtCity, setDistrictCity] = useState("");

  // Account Status
  const [currentStatus, setCurrentStatus] = useState<string>("Blocked");
  const [reasonCategories, setReasonCategories] = useState<string[]>([
    "Missed Quarterly Target",
  ]);
  const [reasonExplanation, setReasonExplanation] = useState("");

  // Quarters Activity Matrix
  const [quarterMatrix, setQuarterMatrix] = useState<
    Record<string, { completed: boolean; status: "Active" | "Missed" }>
  >({
    Q1: { completed: true, status: "Active" },
    Q2: { completed: false, status: "Missed" },
    Q3: { completed: false, status: "Missed" },
    Q4: { completed: true, status: "Active" },
  });

  // Calculate missed quarters count
  const missedQuartersCount = useMemo(() => {
    let count = 0;
    Object.values(quarterMatrix).forEach((q) => {
      if (q.status === "Missed" || !q.completed) {
        count += 1;
      }
    });
    return Math.max(1, count); // at least 1 quarter if reactivating
  }, [quarterMatrix]);

  // Dynamic formula calculation
  const minimumPurchase =
    BUSINESS_MIN_PURCHASE[reactivationType] || 5000;
  const reactivationAmount = minimumPurchase * missedQuartersCount;

  // KYC Verification Checklist
  const [kycChecks, setKycChecks] = useState<Record<string, boolean>>({
    aadhaar: true,
    pan: true,
    ckyc: false,
    mobileOtp: true,
    emailVerified: true,
    businessPan: true,
    gst: true,
    tan: false,
    businessReg: true,
    bankAccount: true,
  });

  // Declarations
  const [confirmPoints, setConfirmPoints] = useState<Record<string, boolean>>({
    allCorrect: true,
    noDuplicateRewards: true,
    restoresOriginalUAID: true,
    noRetrospectiveRewards: true,
    purchaseFormulaAccepted: true,
    termsAccepted: true,
  });

  // Mandatory submission declaration checkbox (Requirement 10)
  const [mandatoryDeclaration, setMandatoryDeclaration] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState("");

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    requestId: string;
    uaid: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Toggle reason checkboxes
  const toggleReasonCategory = (category: string) => {
    setReasonCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  // Toggle Quarter status
  const updateQuarter = (
    quarter: string,
    completed: boolean,
    status: "Active" | "Missed"
  ) => {
    setQuarterMatrix((prev) => ({
      ...prev,
      [quarter]: { completed, status },
    }));
  };

  // Toggle KYC checks
  const toggleKyc = (key: string) => {
    setKycChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!uaid.trim()) {
      errors.uaid = "UAID is required.";
    } else if (uaid.trim().length < 4) {
      errors.uaid = "Please enter a valid UAID format (e.g., UAID-XXXX or NRY-XX-XXXX).";
    }

    if (!applicantName.trim()) {
      errors.applicantName = "Applicant name is required.";
    }

    const cleanMobile = mobileNumber.replace(/\D/g, "");
    const normalizedMobile =
      cleanMobile.length === 12 && cleanMobile.startsWith("91")
        ? cleanMobile.slice(2)
        : cleanMobile;

    if (!cleanMobile) {
      errors.mobileNumber = "Please enter a valid mobile number.";
    } else if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
      errors.mobileNumber = "Please enter a valid 10-digit Indian mobile number.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!reactivationType) {
      errors.reactivationType = "Please select your account category.";
    }

    if (!reasonExplanation.trim()) {
      errors.reasonExplanation = "Please provide the reason for reactivation.";
    }

    if (!mandatoryDeclaration) {
      setMandatoryDeclaration(true);
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      // Scroll to first error
      const firstErrorKey = Object.keys(fieldErrors)[0];
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        applicationNumber,
        filingDate,
        reactivationType,
        applicantName,
        businessName,
        uaid,
        mobileNumber,
        email,
        country,
        state: stateProvince,
        city: districtCity,
        currentStatus,
        reasonCategories,
        reason: reasonExplanation,
        missedPeriod: `${missedQuartersCount} Quarter(s) [${Object.entries(
          quarterMatrix
        )
          .filter(([_, q]) => q.status === "Missed")
          .map(([q]) => q)
          .join(", ")}]`,
        missedQuartersCount,
        minimumPurchase,
        reactivationAmount,
        quarterDetails: quarterMatrix,
        kycChecks,
        declarationAccepted: mandatoryDeclaration,
        signature: digitalSignature || applicantName,
      };

      const res = await fetch("/api/contact/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const reqId = data.requestId || "REQ-ADM-2026";
        const cleanUaid = data.uaid || uaid.toUpperCase();
        setSubmittedData({
          requestId: reqId,
          uaid: cleanUaid,
        });

        // Automatically connect to support@noryvantaglobal.com with prefilled dossier
        if (typeof window !== "undefined") {
          const mailto = `mailto:support@noryvantaglobal.com?subject=${encodeURIComponent(
            `UAID Reactivation Request - ${cleanUaid} (${reqId})`
          )}&body=${encodeURIComponent(
            `Dear Noryvanta Global Support,\n\nI have submitted my online UAID Reactivation Form.\n\nApplication Details:\n- Request ID: ${reqId}\n- UAID: ${cleanUaid}\n- Applicant Name: ${applicantName}\n- Business Name: ${businessName || "N/A"}\n- Mobile: ${mobileNumber}\n- Category: ${reactivationType}\n- Missed Period: ${missedQuartersCount} Quarter(s)\n- Calculated Reactivation Purchase: INR ${reactivationAmount.toLocaleString("en-IN")}\n\nPlease verify and confirm my account restoration status.\n\nThank you,\n${applicantName}`
          )}`;
          setTimeout(() => {
            window.location.href = mailto;
          }, 350);
        }
      } else {
        setSubmitError(
          data.error ||
            "Unable to submit your request at this time. Please try again or contact support@noryvantaglobal.com."
        );
      }
    } catch (err) {
      setSubmitError(
        "Unable to submit your request at this time. Please try again or contact support@noryvantaglobal.com."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleReset = () => {
    setSubmittedData(null);
    setSubmitError(null);
    setFieldErrors({});
    setMandatoryDeclaration(false);
  };

  return (
    <div
      id="uaid-reactivation-form-container"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all text-slate-800"
    >
      {/* ─── SUCCESS SCREEN ────────────────────────────────────────── */}
      {submittedData ? (
        <div className="p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 animate-fadeIn">
          <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Request Logged: {submittedData.requestId}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#113D60] tracking-tight">
              Request Submitted Successfully
            </h2>
          </div>

          <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3 text-xs sm:text-sm text-slate-700">
            <p className="font-semibold text-slate-900">
              Your UAID Reactivation Request has been submitted successfully.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Our support team will review your request and contact you at the
              registered email/mobile number.
            </p>
            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block">Submitted UAID:</span>
                <span className="font-mono font-bold text-[#113D60]">
                  {submittedData.uaid}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Recipient Support:</span>
                <a
                  href={`mailto:support@noryvantaglobal.com?subject=${encodeURIComponent(
                    `UAID Reactivation Request - ${submittedData.uaid} (${submittedData.requestId})`
                  )}`}
                  className="font-semibold text-cyan-700 hover:text-cyan-800 underline flex items-center gap-1 mt-0.5"
                >
                  <Mail className="w-3.5 h-3.5 text-cyan-600" />
                  support@noryvantaglobal.com
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <a
              href={`mailto:support@noryvantaglobal.com?subject=${encodeURIComponent(
                `UAID Reactivation Request - ${submittedData.uaid} (${submittedData.requestId})`
              )}&body=${encodeURIComponent(
                `Dear Noryvanta Global Support,\n\nI have submitted my online UAID Reactivation Form.\n\nDetails:\n- Request ID: ${submittedData.requestId}\n- UAID: ${submittedData.uaid}\n- Applicant Name: ${applicantName}\n- Mobile: ${mobileNumber}\n- Category: ${reactivationType}\n\nPlease confirm receipt and process the reactivation.\n\nThank you,\n${applicantName}`
              )}`}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 shadow-md hover:shadow-cyan-500/25 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-slate-950" />
              <span>Connect to support@noryvantaglobal.com</span>
            </a>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print Submission Copy</span>
            </button>

            {onSuccessClose ? (
              <button
                type="button"
                onClick={onSuccessClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <span>Back to Contact</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Submit Another Request</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ─── OFFICIAL 2-PAGE EQUIVALENT REACTIVATION FORM ─────────────── */
        <form onSubmit={handleSubmit} className="divide-y divide-slate-200">
          {/* Header Bar matching Master Brand & PDF Dossier Format */}
          <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
                <Image
                  src="/logo-icon.png"
                  alt="Noryvanta - Global"
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-extrabold text-xl sm:text-2xl text-[#113D60] tracking-tight">
                    Noryvanta
                  </span>
                  <span className="font-semibold text-base sm:text-lg text-slate-500 tracking-tight">
                    - Global
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-bold text-cyan-700 tracking-[0.2em] uppercase mt-0.5">
                  C O N N E C T . G R O W . T H R I V E
                </p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                UAID REACTIVATION FORM
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Request reactivation of your blocked/inactive UAID.
              </p>
              <div className="flex flex-wrap md:justify-end items-center gap-2 sm:gap-3 text-[11px] text-slate-500 mt-1 font-medium">
                <span>
                  Website: <strong className="text-slate-800">noryvantaglobal.com</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span>
                  Support:{" "}
                  <a
                    href="mailto:support@noryvantaglobal.com"
                    className="text-[#113D60] hover:underline font-semibold"
                  >
                    support@noryvantaglobal.com
                  </a>
                </span>
              </div>
            </div>
          </div>

          {/* Form UAID-REACT-01 Official Banner */}
          <div className="bg-[#113D60] text-white px-6 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-medium tracking-wide">
            <span className="flex items-center gap-1.5 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Noryvanta Enterprise Systems • Form UAID-REACT-01
            </span>
            <span className="text-cyan-200">
              Controlled Single Permanent UAID Restoration Engine
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* ─── SECTION 1: REACTIVATION REQUEST DETAILS ─────────────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  1. Reactivation Request Details
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Application Number
                  </label>
                  <input
                    type="text"
                    value={applicationNumber}
                    onChange={(e) => setApplicationNumber(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#113D60]"
                    placeholder="APP-2026-UAID-____"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Filing Date
                  </label>
                  <input
                    type="text"
                    value={filingDate}
                    onChange={(e) => setFilingDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#113D60]"
                    placeholder="DD / MM / YYYY"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-2">
                  Select Reactivation Type / Account Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: "Wholesaler", label: "Wholesaler" },
                    { id: "Distributor", label: "Distributor" },
                    { id: "Retailer", label: "Retailer" },
                    { id: "Service Provider", label: "Service Provider" },
                    { id: "Customer/User", label: "Customer/User" },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setReactivationType(cat.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border text-center transition flex items-center justify-center gap-1.5 ${
                        reactivationType === cat.id
                          ? "bg-[#113D60] text-white border-[#113D60] shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reactivationType"
                        checked={reactivationType === cat.id}
                        onChange={() => setReactivationType(cat.id)}
                        className="sr-only"
                      />
                      <span
                        className={`w-2.5 h-2.5 rounded-full border flex items-center justify-center ${
                          reactivationType === cat.id
                            ? "border-white bg-white"
                            : "border-slate-400"
                        }`}
                      >
                        {reactivationType === cat.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#113D60]" />
                        )}
                      </span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
                {fieldErrors.reactivationType && (
                  <p className="text-xs text-red-600 font-medium mt-1">
                    {fieldErrors.reactivationType}
                  </p>
                )}
              </div>
            </div>

            {/* ─── SECTION 2: ACCOUNT INFORMATION ─────────────────────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  2. Account Information
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Registered Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Registered Name (Full Legal Name as per ID Proof) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    placeholder="Enter full legal name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-slate-800 transition focus:outline-none focus:ring-2 focus:ring-[#113D60] ${
                      fieldErrors.applicantName
                        ? "border-red-500 bg-red-50/30"
                        : "border-slate-300 bg-white"
                    }`}
                  />
                  {fieldErrors.applicantName && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {fieldErrors.applicantName}
                    </p>
                  )}
                </div>

                {/* Business / Shop Name */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Business / Shop Name (Registered Entity / Shop Name)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Metro Electronics Pvt Ltd"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#113D60]"
                  />
                </div>

                {/* UAID Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    UAID Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={uaid}
                      onChange={(e) => setUaid(e.target.value.toUpperCase())}
                      placeholder="e.g. UAID-750789 or NRY-HS-METRO-102938"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-mono font-bold uppercase text-slate-900 transition focus:outline-none focus:ring-2 focus:ring-[#113D60] ${
                        fieldErrors.uaid
                          ? "border-red-500 bg-red-50/30"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>
                  {fieldErrors.uaid ? (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {fieldErrors.uaid}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Enters your existing unique Noryvanta UAID.
                    </p>
                  )}
                </div>

                {/* Registered Mobile Number */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Registered Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 bg-slate-50 text-slate-600 text-xs font-bold">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="7507897697"
                      maxLength={12}
                      className={`w-full px-3.5 py-2.5 rounded-r-xl border text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#113D60] ${
                        fieldErrors.mobileNumber
                          ? "border-red-500 bg-red-50/30"
                          : "border-slate-300 bg-white"
                      }`}
                    />
                  </div>
                  {fieldErrors.mobileNumber && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {fieldErrors.mobileNumber}
                    </p>
                  )}
                </div>

                {/* Registered Email */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Registered Email ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@domain.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#113D60] ${
                      fieldErrors.email
                        ? "border-red-500 bg-red-50/30"
                        : "border-slate-300 bg-white"
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Country, State, District */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      State / Province
                    </label>
                    <input
                      type="text"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      District / City
                    </label>
                    <input
                      type="text"
                      value={districtCity}
                      onChange={(e) => setDistrictCity(e.target.value)}
                      placeholder="e.g. Pune"
                      className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 3: ACCOUNT STATUS & REASON ──────────────────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  3. Account Status &amp; Reason for Reactivation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-2">
                    Current UAID Status:
                  </label>
                  <div className="flex gap-2">
                    {["Active", "Suspended", "Blocked"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setCurrentStatus(status)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border text-center transition flex items-center justify-center gap-1.5 ${
                          currentStatus === status
                            ? "bg-slate-800 text-white border-slate-800"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === "Active"
                              ? "bg-emerald-400"
                              : status === "Suspended"
                              ? "bg-amber-400"
                              : "bg-red-400"
                          }`}
                        />
                        <span>{status}</span>
                      </button>
                    ))}
                  </div>

                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mt-4 mb-2">
                    Reason for Reactivation Request (Select Applicable):
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      "Missed Quarterly Target",
                      "KYC Pending",
                      "Payment Issue",
                      "Account Verification",
                    ].map((reasonCat) => (
                      <label
                        key={reasonCat}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none transition ${
                          reasonCategories.includes(reasonCat)
                            ? "bg-cyan-50/60 border-cyan-300 text-[#113D60] font-semibold"
                            : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={reasonCategories.includes(reasonCat)}
                          onChange={() => toggleReasonCategory(reasonCat)}
                          className="w-4 h-4 text-[#113D60] rounded border-slate-300 focus:ring-[#113D60]"
                        />
                        <span>{reasonCat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Detailed Reason for Reactivation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={reasonExplanation}
                    onChange={(e) => setReasonExplanation(e.target.value)}
                    placeholder="Describe the circumstance causing inactivity or reason for request..."
                    className={`w-full p-3 rounded-xl border text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#113D60] ${
                      fieldErrors.reasonExplanation
                        ? "border-red-500 bg-red-50/30"
                        : "border-slate-300 bg-white"
                    }`}
                  />
                  {fieldErrors.reasonExplanation && (
                    <p className="text-xs text-red-600 font-medium mt-1">
                      {fieldErrors.reasonExplanation}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ─── SECTION 4: QUARTERLY ACTIVITY CALCULATION ───────────────── */}
            <div>
              <div className="flex items-center justify-between border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  4. Quarterly Activity Calculation (Click to Toggle Missed)
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {missedQuartersCount} Quarter(s) Missed
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#113D60] text-white uppercase text-[11px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4 font-semibold">Quarter</th>
                      <th className="py-2.5 px-4 font-semibold">Required Purchase</th>
                      <th className="py-2.5 px-4 font-semibold text-center">Completed</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      { id: "Q1", label: "Q1 (Jan–Mar)" },
                      { id: "Q2", label: "Q2 (Apr–Jun)" },
                      { id: "Q3", label: "Q3 (Jul–Sep)" },
                      { id: "Q4", label: "Q4 (Oct–Dec)" },
                    ].map((q) => {
                      const current = quarterMatrix[q.id];
                      const isMissed = current.status === "Missed";
                      return (
                        <tr
                          key={q.id}
                          className={`hover:bg-slate-50 transition ${
                            isMissed ? "bg-amber-50/40" : ""
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {q.label}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            Yes
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-3">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`completed-${q.id}`}
                                  checked={current.completed}
                                  onChange={() => updateQuarter(q.id, true, "Active")}
                                  className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="font-semibold text-emerald-800">Yes</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`completed-${q.id}`}
                                  checked={!current.completed}
                                  onChange={() => updateQuarter(q.id, false, "Missed")}
                                  className="text-amber-600 focus:ring-amber-500"
                                />
                                <span className="font-semibold text-amber-800">No</span>
                              </label>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuarter(q.id, true, "Active")}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                                  !isMissed
                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={() => updateQuarter(q.id, false, "Missed")}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition ${
                                  isMissed
                                    ? "bg-amber-100 text-amber-800 border border-amber-300 font-extrabold"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                Missed
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ─── SECTION 5: REACTIVATION PURCHASE CALCULATION ────────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  5. Reactivation Purchase Calculation (Dynamic Formula)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Official Rule Reference Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                  <div className="bg-[#113D60] text-white px-4 py-2 font-bold text-xs uppercase tracking-wider flex justify-between">
                    <span>Business Type</span>
                    <span>Minimum Purchase</span>
                  </div>
                  <div className="divide-y divide-slate-200 text-xs">
                    <div
                      className={`flex justify-between p-2.5 ${
                        reactivationType === "Wholesaler" || reactivationType === "Wholeseller"
                          ? "bg-cyan-50 font-bold text-[#113D60]"
                          : ""
                      }`}
                    >
                      <span>Wholesaler</span>
                      <span className="font-mono">₹1,00,000</span>
                    </div>
                    <div
                      className={`flex justify-between p-2.5 ${
                        reactivationType === "Distributor"
                          ? "bg-cyan-50 font-bold text-[#113D60]"
                          : ""
                      }`}
                    >
                      <span>Distributor</span>
                      <span className="font-mono">₹10,000</span>
                    </div>
                    <div
                      className={`flex justify-between p-2.5 ${
                        reactivationType === "Retailer"
                          ? "bg-cyan-50 font-bold text-[#113D60]"
                          : ""
                      }`}
                    >
                      <span>Retailer</span>
                      <span className="font-mono">₹5,000</span>
                    </div>
                    <div
                      className={`flex justify-between p-2.5 ${
                        reactivationType === "Service Provider"
                          ? "bg-cyan-50 font-bold text-[#113D60]"
                          : ""
                      }`}
                    >
                      <span>Service Provider</span>
                      <span className="font-mono">₹5,000</span>
                    </div>
                  </div>
                </div>

                {/* Calculation Formula Result Box matching PDF */}
                <div className="rounded-2xl border-2 border-cyan-500/60 bg-gradient-to-br from-cyan-50/50 via-white to-emerald-50/40 p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-100 px-2 py-0.5 rounded">
                      System Formula
                    </span>
                    <p className="text-xs font-semibold text-slate-700 mt-2 font-mono">
                      Required Purchase Amount = Minimum Purchase × Missed Quarters
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-cyan-200 grid grid-cols-5 items-center gap-1 text-center font-mono">
                    <div className="col-span-2">
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        MINIMUM PURCHASE
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-[#113D60]">
                        ₹{minimumPurchase.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-400">×</div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        MISSED
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-amber-700">
                        {missedQuartersCount} Qtr
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-slate-500 block">
                        REQUIRED
                      </span>
                      <span className="text-sm sm:text-base font-extrabold text-emerald-700">
                        = ₹{reactivationAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 6: KYC VERIFICATION CHECKLIST (PDF PAGE 2) ──────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  6. KYC Verification Checklist (Clickable Dossier Checks)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 text-[#113D60]">
                    Individual Verification
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "aadhaar", label: "Aadhaar Number Verified" },
                      { key: "pan", label: "PAN Number Verified" },
                      { key: "ckyc", label: "CKYC / KYC Number Verified" },
                      { key: "mobileOtp", label: "Mobile OTP Verified" },
                      { key: "emailVerified", label: "Email Verified" },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!!kycChecks[item.key]}
                          onChange={() => toggleKyc(item.key)}
                          className="w-4 h-4 rounded text-[#113D60] focus:ring-[#113D60]"
                        />
                        <span className="text-slate-700 font-medium">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 uppercase text-[11px] mb-2 text-[#113D60]">
                    Business Verification
                  </h4>
                  <div className="space-y-2">
                    {[
                      { key: "businessPan", label: "Business PAN" },
                      { key: "gst", label: "GST / Tax Number" },
                      { key: "tan", label: "TAN (If Applicable)" },
                      {
                        key: "businessReg",
                        label: "Business Registration Certificate",
                      },
                      {
                        key: "bankAccount",
                        label: "Bank Account Verified / Cancelled Cheque",
                      },
                    ].map((item) => (
                      <label
                        key={item.key}
                        className="flex items-center gap-2 cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={!!kycChecks[item.key]}
                          onChange={() => toggleKyc(item.key)}
                          className="w-4 h-4 rounded text-[#113D60] focus:ring-[#113D60]"
                        />
                        <span className="text-slate-700 font-medium">
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ─── SECTION 7: DECLARATION (PDF PAGE 2 & REQ 10) ────────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  7. Reactivation Declaration &amp; Consent
                </span>
              </div>

              <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <p className="font-bold text-slate-900 mb-1">I confirm that:</p>
                {[
                  {
                    key: "allCorrect",
                    text: "All information provided is correct.",
                  },
                  {
                    key: "noDuplicateRewards",
                    text: "I understand that duplicate UAIDs are not eligible for rewards.",
                  },
                  {
                    key: "restoresOriginalUAID",
                    text: "I agree that reactivation restores only the original UAID.",
                  },
                  {
                    key: "noRetrospectiveRewards",
                    text: "Missed quarter rewards will not be generated retrospectively.",
                  },
                  {
                    key: "purchaseFormulaAccepted",
                    text: "Reactivation purchase amount is calculated according to Noryvanta business rules.",
                  },
                  {
                    key: "termsAccepted",
                    text: "I agree to Noryvanta Terms & Conditions and Data Policies.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-2 cursor-pointer select-none py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={!!confirmPoints[item.key]}
                      onChange={() =>
                        setConfirmPoints((prev) => ({
                          ...prev,
                          [item.key]: !prev[item.key],
                        }))
                      }
                      className="w-4 h-4 rounded text-[#113D60] focus:ring-[#113D60] mt-0.5 shrink-0"
                    />
                    <span>{item.text}</span>
                  </label>
                ))}
              </div>

              {/* MANDATORY SUBMISSION DECLARATION CHECKBOX (REQ 10) */}
              <div
                className={`mt-4 p-4 rounded-2xl border-2 transition ${
                  mandatoryDeclaration
                    ? "bg-emerald-50/60 border-emerald-500/80"
                    : fieldErrors.declaration
                    ? "bg-red-50/60 border-red-500"
                    : "bg-slate-100/70 border-slate-300"
                }`}
              >
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={mandatoryDeclaration}
                    onChange={(e) => setMandatoryDeclaration(e.target.checked)}
                    className="w-5 h-5 rounded text-[#113D60] focus:ring-[#113D60] mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 block leading-snug">
                      I confirm that the information provided by me is correct
                      and that I agree to the Noryvanta Global UAID reactivation
                      rules and applicable Terms &amp; Conditions.{" "}
                      <span className="text-red-500">*</span>
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Mandatory declaration required before submitting the reactivation request.
                    </span>
                  </div>
                </label>
                {fieldErrors.declaration && (
                  <p className="text-xs text-red-600 font-bold mt-2">
                    {fieldErrors.declaration}
                  </p>
                )}
              </div>

              {/* Digital Signature & Date Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Applicant Name / Digital Signature
                  </label>
                  <input
                    type="text"
                    value={digitalSignature}
                    onChange={(e) => setDigitalSignature(e.target.value)}
                    placeholder={applicantName || "Type your full legal name"}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 italic"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-600 tracking-wider mb-1">
                    Date of Declaration
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={filingDate}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-600 bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* ─── SECTION 8: 5-STEP SYSTEM WORKFLOW (PDF PAGE 2) ─────────── */}
            <div>
              <div className="flex items-center gap-2 border-l-4 border-[#113D60] pl-3 mb-4">
                <span className="font-bold text-sm sm:text-base text-slate-900 tracking-wide uppercase">
                  8. Controlled Reactivation Workflow (5 Steps)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                {[
                  {
                    step: 1,
                    title: "Submission",
                    desc: "User submits Reactivation Form online.",
                  },
                  {
                    step: 2,
                    title: "Backend Check",
                    desc: "Backend checks original UAID and calculates missed quarters.",
                  },
                  {
                    step: 3,
                    title: "Purchase",
                    desc: "Required purchase amount generated; user completes qualifying order.",
                  },
                  {
                    step: 4,
                    title: "Verification",
                    desc: "Payment, invoice, and KYC clearance confirmed.",
                  },
                  {
                    step: 5,
                    title: "Activation",
                    desc: "Original UAID becomes ACTIVE; reward cycle resumes with full audit trail.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center text-xs"
                  >
                    <div className="w-6 h-6 rounded-full bg-[#113D60] text-white font-bold flex items-center justify-center text-[11px] mb-1.5 shadow-2xs">
                      {item.step}
                    </div>
                    <span className="font-bold text-slate-900 mb-1 leading-snug">
                      {item.title}
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Banner */}
            {submitError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs sm:text-sm text-red-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{submitError}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Contact directly:{" "}
                    <a
                      href="mailto:support@noryvantaglobal.com"
                      className="font-bold underline hover:text-red-900"
                    >
                      support@noryvantaglobal.com
                    </a>
                  </p>
                </div>
              </div>
            )}

            {/* ─── ACTION BUTTONS (SUBMIT & PRINT) ─────────────────────────── */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handlePrint}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition"
                title="Print official Form UAID-REACT-01 with entered data"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print / Save Dossier Copy</span>
              </button>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl text-sm font-bold text-white shadow-md transition flex items-center justify-center gap-2 ${
                  submitting
                    ? "bg-slate-400 cursor-wait opacity-80"
                    : "bg-[#113D60] hover:bg-slate-800 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.01]"
                }`}
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting to support@noryvantaglobal.com...</span>
                  </>
                ) : (
                  <>
                    <span>Submit UAID Reactivation Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
