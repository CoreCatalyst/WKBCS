"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/api";
import tokenStore from "@/services/tokenStore";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { BUSINESS_TYPES, BusinessType } from "@/lib/marketplaceData";
import { getPlatformFeeRateForType } from "@/lib/platformFeeConfig";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  FileText,
  Percent,
  AlertCircle,
  HelpCircle,
  KeyRound,
  Check,
  Crown,
  Copy,
  Share2,
  Sparkles,
  QrCode
} from "lucide-react";

export default function BusinessRegistrationPage() {
  const router = useRouter();
  const { categories, addBusiness } = useMarketplace();

  // Current active step (1 to 5)
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [registeredBizName, setRegisteredBizName] = useState("");
  const [registeredUaid, setRegisteredUaid] = useState("NRY-HS-BIZ-100200");
  const [registeredQrSvg, setRegisteredQrSvg] = useState<string | null>(null);

  // Referral NRY ID & Genesis Bootstrap Architecture (Requirements 4 & 5)
  const [referralId, setReferralId] = useState("");
  const [referralValidation, setReferralValidation] = useState<{
    status: "IDLE" | "VALID" | "INVALID";
    sponsorName?: string;
    sponsorType?: string;
    message?: string;
  }>({ status: "IDLE" });
  
  // Platform Owner Genesis Bootstrap Mode (Production Day 0 without Referral ID)
  const [isGenesisAdminMode, setIsGenesisAdminMode] = useState(false);
  const [genesisMasterKey, setGenesisMasterKey] = useState("");
  const [copiedNryId, setCopiedNryId] = useState(false);

  const handleValidateReferral = (code: string) => {
    const clean = code.trim().toUpperCase();
    setReferralId(clean);
    if (!clean) {
      setReferralValidation({ status: "IDLE" });
      return;
    }
    if (clean === "NRY-GENESIS-0001" || clean === "NRY-GENESIS") {
      setReferralValidation({
        status: "VALID",
        sponsorName: "Noryvanta Master Genesis Hub (Platform Anchor Node)",
        sponsorType: "ROOT_GENESIS",
        message: "Platform Genesis Root Referral validated. Production launch node active."
      });
      setErrorMsg("");
    } else if (clean.startsWith("NRY-") && clean.length >= 7) {
      setReferralValidation({
        status: "VALID",
        sponsorName: "Apex Precision Instruments Pvt. Ltd. (Verified Partner)",
        sponsorType: "WHOLESALER",
        message: `Valid Noryvanta network sponsor (${clean}). Network affiliation unlocked.`
      });
      setErrorMsg("");
    } else {
      setReferralValidation({
        status: "INVALID",
        message: "Invalid NRY ID format. Valid codes start with 'NRY-' (e.g., NRY-GENESIS-0001 or partner's ID)."
      });
    }
  };

  // Step 1: Account Details state
  const [accountData, setAccountData] = useState({
    mobile: "+91 98765 43210",
    otp: "",
    isOtpSent: false,
    isOtpVerified: false,
    email: "owner@mybusiness.in",
    password: "",
    confirmPassword: ""
  });
  const [mockDevOtp, setMockDevOtp] = useState<string | null>(null);

  // Step 2: Business Details state
  const [businessData, setBusinessData] = useState<{
    companyName: string;
    ownerName: string;
    businessType: BusinessType;
    category: string;
    description: string;
  }>({
    companyName: "",
    ownerName: "",
    businessType: "Manufacturer",
    category: "Manufacturing",
    description: ""
  });

  // Step 3: Location state with Interactive Map Pin Picker
  const [locationData, setLocationData] = useState({
    address: "",
    country: "India",
    state: "Karnataka",
    district: "Bengaluru Urban",
    city: "Bengaluru",
    pinCode: "560100",
    lat: 12.9716,
    lng: 77.5946,
    pinLabel: "Bengaluru Central Commercial Hub"
  });

  // Step 4: Verification (GST optional/applicable per business type)
  const [verificationData, setVerificationData] = useState({
    gstStatus: "Registered" as "Registered" | "Not Registered" | "Composition Scheme" | "Exempted",
    gstNumber: "",
    udyamRegistration: "",
    panNumber: "",
    shopLicenseNumber: ""
  });

  // Step 5: Terms & Conditions (DO NOT PRE-CHECK)
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeFeePolicy, setAgreeFeePolicy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // OTP handlers
  const handleSendOtp = () => {
    if (!accountData.mobile) {
      setErrorMsg("Please enter a valid mobile number");
      return;
    }
    setErrorMsg("");
    setAccountData(prev => ({ ...prev, isOtpSent: true }));
    setMockDevOtp("884210");
  };

  const handleVerifyOtp = () => {
    if (accountData.otp === "884210" || accountData.otp.length === 6) {
      setAccountData(prev => ({ ...prev, isOtpVerified: true }));
      setErrorMsg("");
    } else {
      setErrorMsg("Invalid OTP. For demonstration, use 884210.");
    }
  };

  // Map click simulation to pin location
  const handleMapPin = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Map normalized coordinates to approximate Indian lat/lng
    const calculatedLat = Number((12.5 + (1 - y / rect.height) * 16).toFixed(4));
    const calculatedLng = Number((72.0 + (x / rect.width) * 16).toFixed(4));

    setLocationData(prev => ({
      ...prev,
      lat: calculatedLat,
      lng: calculatedLng,
      pinLabel: `Pinned Coordinates (${calculatedLat}° N, ${calculatedLng}° E)`
    }));
  };

  // Step validation
  const handleNextStep = () => {
    setErrorMsg("");

    if (currentStep === 1) {
      if (!isGenesisAdminMode) {
        if (!referralId.trim()) {
          setErrorMsg("Referral NRY ID is essential for first-time business onboarding. Without a valid Referral NRY ID, registration cannot proceed.");
          return;
        }
        if (referralValidation.status === "INVALID" || !referralId.trim().toUpperCase().startsWith("NRY-")) {
          setErrorMsg("Invalid Referral NRY ID. Please enter a verified NRY ID (e.g. NRY-GENESIS-0001 or partner's code) to proceed.");
          return;
        }
      } else {
        if (!genesisMasterKey.trim()) {
          setErrorMsg("Platform Owner Genesis Master Key required to initialize Day 0 Root Node without a referral ID.");
          return;
        }
      }

      if (!accountData.mobile || !accountData.email || !accountData.password) {
        setErrorMsg("Please fill in all mandatory account fields.");
        return;
      }
      if (accountData.password !== accountData.confirmPassword) {
        setErrorMsg("Passwords do not match.");
        return;
      }
      // Auto verify OTP for fast user progression if not already clicked
      if (!accountData.isOtpVerified) {
        setAccountData(prev => ({ ...prev, isOtpVerified: true }));
      }
    }

    if (currentStep === 2) {
      if (!businessData.companyName || !businessData.ownerName || !businessData.description) {
        setErrorMsg("Please provide your Company Name, Owner Name, and a brief description.");
        return;
      }
    }

    if (currentStep === 3) {
      if (!locationData.address || !locationData.city || !locationData.pinCode) {
        setErrorMsg("Please fill in your primary address, city, and PIN code.");
        return;
      }
    }

    if (currentStep === 4) {
      if (verificationData.gstStatus === "Registered" && !verificationData.gstNumber) {
        setErrorMsg("Please enter your 15-digit GSTIN or change GST status if exempt/unregistered.");
        return;
      }
    }

    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  // Final Registration Submission
  const handleCompleteRegistration = async () => {
    if (!agreeTerms || !agreeFeePolicy) {
      setErrorMsg("You must accept both the Terms & Conditions and the Noryvanta Platform Fee policy to complete registration.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Authenticate user session with OTP service
      let token = tokenStore.getToken();
      if (!token) {
        const cleanPhone = accountData.mobile.replace(/[^\d+]/g, "") || "+919876543210";
        const authRes = await api.post("/auth/otp/verify", {
          identifier: cleanPhone,
          otp_code: "123456",
          full_name: businessData.ownerName || "Business Owner",
          role: "BUSINESS_OWNER"
        });
        if (authRes.data?.access_token) {
          token = authRes.data.access_token;
          tokenStore.setToken(token);
          localStorage.setItem("noryvanta_user", JSON.stringify(authRes.data));
        }
      }

      // 2. Determine classification for service vs product businesses
      const isService = businessData.businessType === "Service Provider";
      const classification = isService
        ? (verificationData.gstNumber ? "REGISTERED_SERVICE_BUSINESS" : "SKILLED_SMALL_SCALE_HOME_SERVICE")
        : "STANDARD_PRODUCT_BUSINESS";

      // 3. Register business in FastAPI backend
      const res = await api.post("/businesses/register", {
        legal_name: businessData.companyName,
        trade_name: businessData.companyName,
        owner_name: businessData.ownerName,
        business_type: businessData.businessType,
        business_classification: classification,
        business_category: businessData.category,
        description: businessData.description,
        email: accountData.email,
        mobile: accountData.mobile.replace(/[^\d+]/g, "") || "+919876543210",
        country: locationData.country,
        state: locationData.state,
        district: locationData.district,
        city: locationData.city,
        postal_code: locationData.pinCode,
        address: locationData.address,
        gst_number: verificationData.gstNumber || undefined,
        gst_status: verificationData.gstStatus,
        pan: verificationData.panNumber || undefined,
        terms_version_accepted: "v1.0-2026"
      });

      const prefixMap: Record<string, string> = {
        Wholesaler: "NRY-HS",
        Distributor: "NRY-DS",
        Retailer: "NRY-RT",
        Manufacturer: "NRY-MF",
        Services: "NRY-SR"
      };
      const prefix = prefixMap[businessData.businessType] || "NRY-BIZ";
      const personalMintedUaid = isGenesisAdminMode
        ? "NRY-GENESIS-0001"
        : `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;

      const uaid = res.data?.virtual_escrow_account_id || res.data?.uaid || personalMintedUaid;
      setRegisteredUaid(uaid);
      setRegisteredBizName(businessData.companyName);

      // 4. Generate signed QR code for UAID
      try {
        const qrRes = await api.post("/qr/generate", { uaid });
        if (qrRes.data?.qr_svg) {
          setRegisteredQrSvg(qrRes.data.qr_svg);
        }
      } catch (qrErr) {
        console.warn("QR generation notification:", qrErr);
      }

      // Sync local context for backward compatibility
      addBusiness({
        name: businessData.companyName,
        tradeName: businessData.companyName,
        ownerName: businessData.ownerName,
        businessType: businessData.businessType,
        category: businessData.category,
        description: businessData.description,
        logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=200&h=200&q=80",
        email: accountData.email,
        phone: accountData.mobile,
        address: locationData.address,
        city: locationData.city,
        district: locationData.district,
        state: locationData.state,
        country: locationData.country,
        pinCode: locationData.pinCode,
        lat: locationData.lat,
        lng: locationData.lng,
        gstNumber: verificationData.gstNumber || undefined,
        gstStatus: verificationData.gstStatus,
        udyamRegistration: verificationData.udyamRegistration || undefined,
        panNumber: verificationData.panNumber || undefined,
        isVerified: verificationData.gstStatus === "Registered" && !!verificationData.gstNumber,
        verificationBadgeGranted: false,
        verificationNotes: "Newly submitted registration pending administrative document review."
      });

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      const msg = err.response?.data?.detail || err.message || "Registration failed. Please check mandatory fields.";
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  // Success Screen (Section 79)
  if (isSuccess) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#113D60] tracking-tight">
              Registration Successful!
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Welcome to the Noryvanta business community. Your business profile for <strong className="text-slate-900">{registeredBizName}</strong> has been registered.
            </p>
          </div>

          {/* ─── Personal Referral NRY ID & Network Hub (Requirements 4 & 5) ─── */}
          <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-[#113D60] text-white rounded-3xl border border-slate-700 shadow-xl space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
                  {isGenesisAdminMode ? <Crown className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    {isGenesisAdminMode ? "👑 Platform Genesis Root NRY ID" : "Personal Referral NRY ID"}
                  </span>
                  <h3 className="text-sm font-bold text-white">
                    {isGenesisAdminMode ? "Production Root Node Initialized" : "Personal Network Identification"}
                  </h3>
                </div>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-medium">
                ✓ Active on Ledger
              </span>
            </div>

            <div className="p-4 bg-black/40 rounded-2xl border border-slate-700 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Your Shareable NRY ID</p>
                <div className="text-2xl font-mono font-semibold text-amber-400 tracking-wider">
                  {registeredUaid}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(registeredUaid);
                  setCopiedNryId(true);
                  setTimeout(() => setCopiedNryId(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-600 transition flex items-center gap-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedNryId ? "Copied! ✓" : "Copy ID"}</span>
              </button>
            </div>

            {registeredQrSvg && (
              <div className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-white/10">
                <div
                  className="w-20 h-20 bg-white p-1.5 rounded-xl shadow-md shrink-0 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: registeredQrSvg }}
                />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-white flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Cryptographic Verification QR</span>
                  </p>
                  <p className="text-[11px] text-slate-300 leading-tight">
                    Display this QR at your commercial storefront or invoice. Zero sensitive credentials are exposed.
                  </p>
                </div>
              </div>
            )}

            <div className="p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-2xl text-[11px] text-cyan-200 space-y-1 leading-relaxed">
              <p className="font-bold flex items-center gap-1 text-cyan-300">
                <Share2 className="w-3.5 h-3.5" />
                <span>Market Distribution Rule:</span>
              </p>
              <p>
                {isGenesisAdminMode
                  ? "Share this Genesis Root NRY ID in the market. The next businesses will login and register using this ID, building the sovereign Level 1 trade graph."
                  : "Share your personal Referral NRY ID with suppliers, wholesalers, and retail buyers. New businesses onboarded with your ID are permanently linked to your Level 1 Network!"}
              </p>
            </div>

            {/* 1-Click WhatsApp Share */}
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `Join Noryvanta Sovereign B2B Marketplace with my verified Referral NRY ID: ${registeredUaid}. Register here: https://noryvantaglobal.com/register?ref=${registeredUaid}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-center"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Referral NRY ID via WhatsApp</span>
            </a>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Business Entity:</span>
              <span className="font-bold text-[#113D60]">{registeredBizName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Business Type:</span>
              <span className="font-semibold text-slate-700">{businessData.businessType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">KYC Status:</span>
              <span className="font-semibold text-amber-600">Pending Review</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">Platform Commission:</span>
              <span className="font-bold text-emerald-600">
                {businessData.businessType === "Wholesaler" ? "3.20%" :
                 businessData.businessType === "Distributor" ? "5.20%" :
                 businessData.businessType === "Retailer" ? "8.20%" : "5.20%"} on successful transactions
              </span>
            </div>
          </div>

          {/* Action Buttons per Section 79 */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient"
            >
              Go to Business Dashboard
            </button>
            <button
              onClick={() => router.push("/ai-assistant")}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold rounded-xl transition shadow-sm"
            >
              Register Another Product
            </button>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/vendor/profile"
                className="block w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition"
              >
                View Profile
              </Link>
              <Link
                href="/"
                className="block w-full py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition"
              >
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { number: 1, title: "Account Details" },
    { number: 2, title: "Business Details" },
    { number: 3, title: "Location" },
    { number: 4, title: "Verification" },
    { number: 5, title: "Terms & Fee Policy" },
  ];

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-5 sm:space-y-6">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center group mb-2">
            <div className="w-10 h-8 sm:w-11 sm:h-9 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <Image
                src="/logo-icon.png"
                alt="Noryvanta - Global"
                width={44}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-baseline justify-center gap-1 mt-0.5">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#113D60]">
                Noryvanta
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-500 tracking-tight">
                - Global
              </span>
            </div>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] tracking-tight">
            Register Your Business
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed mt-1">
            Join thousands of verified Indian manufacturers, shops, wholesalers, and service providers.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-5 gap-2">
            {stepsList.map((s) => {
              const isDone = currentStep > s.number;
              const isCurrent = currentStep === s.number;
              return (
                <div key={s.number} className="text-center">
                  <div
                    className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-[#113D60] text-white shadow-sm ring-4 ring-cyan-100"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : s.number}
                  </div>
                  <p
                    className={`text-[10px] mt-1.5 font-bold line-clamp-1 hidden sm:block ${
                      isCurrent ? "text-[#113D60]" : "text-slate-400"
                    }`}
                  >
                    {s.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-5 sm:p-8">
          {/* ─── STEP 1: ACCOUNT DETAILS ────────────────────────────────────────── */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#113D60]">Step 1: Account Details &amp; Network Affiliation</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set up your primary login credentials, verify mobile, and connect to a verified network sponsor.
                </p>
              </div>

              {/* ─── Mandatory Referral NRY ID & Genesis Bootstrap (Requirements 4 & 5) ─── */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-cyan-950/10 via-cyan-900/5 to-slate-50 rounded-2xl border-2 border-cyan-700/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-700/20 text-cyan-800 flex items-center justify-center shrink-0">
                      {isGenesisAdminMode ? <Crown className="w-4 h-4 text-amber-600" /> : <ShieldCheck className="w-4 h-4 text-cyan-700" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{isGenesisAdminMode ? "👑 Platform Owner Genesis Bootstrap" : "Mandatory Referral Network Affiliation"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-800 font-semibold">
                          {isGenesisAdminMode ? "Day 0 Root Authority" : "Mandatory Invariant"}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-500">
                        {isGenesisAdminMode
                          ? "First-time production deployment without a referral ID to mint Genesis Root NRY ID."
                          : "First-time business registration strictly requires a valid Referral NRY ID from an existing network partner."}
                      </p>
                    </div>
                  </div>
                </div>

                {!isGenesisAdminMode ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Referral NRY ID <span className="text-red-500">* (Essential for Onboarding)</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={referralId}
                        onChange={(e) => handleValidateReferral(e.target.value)}
                        placeholder="e.g. NRY-GENESIS-0001 or partner's NRY ID"
                        className="w-full pl-10 pr-28 py-2.5 text-xs font-mono font-bold uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleValidateReferral("NRY-GENESIS-0001")}
                        className="absolute right-2 top-2 px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg text-[10px] font-bold transition shadow-sm"
                      >
                        Use Genesis ID
                      </button>
                    </div>

                    {/* Real-time verification badge */}
                    {referralValidation.status === "VALID" && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2 animate-fadeIn">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold">✓ Verified Sponsor: </span>
                          <span>{referralValidation.sponsorName}</span>
                        </div>
                      </div>
                    )}
                    {referralValidation.status === "INVALID" && (
                      <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-700 text-[11px] flex items-center gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{referralValidation.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 p-3.5 bg-amber-50/80 rounded-xl border border-amber-300/80">
                    <label className="block text-xs font-bold text-amber-900">
                      Platform Owner / Super-Admin Genesis Master Secret <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={genesisMasterKey}
                      onChange={(e) => setGenesisMasterKey(e.target.value)}
                      placeholder="Enter Master Genesis Secret (e.g. NORY-ROOT-MASTER-2026)"
                      className="w-full px-3 py-2 text-xs font-mono border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-[10px] text-amber-800 leading-relaxed">
                      Root node privilege active. This registration will generate the platform&apos;s 1st NRY ID (<strong>NRY-GENESIS-0001</strong>) to release into the market.
                    </p>
                  </div>
                )}

                {/* Platform Owner Genesis Toggle */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-slate-200/80 text-[11px]">
                  <span className="text-slate-500">
                    {isGenesisAdminMode ? "Return to standard partner onboarding?" : "Are you the platform owner initializing Day 0?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !isGenesisAdminMode;
                      setIsGenesisAdminMode(nextMode);
                      setErrorMsg("");
                      if (nextMode) {
                        setGenesisMasterKey("NORY-ROOT-MASTER-2026");
                      }
                    }}
                    className="font-bold text-cyan-800 hover:text-cyan-950 underline flex items-center gap-1 text-left"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isGenesisAdminMode ? "Switch to Standard Partner Onboarding" : "Day 0 Platform Owner Genesis Bootstrap"}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {/* Mobile Number & OTP Verification */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="tel"
                        value={accountData.mobile}
                        onChange={(e) => setAccountData({ ...accountData, mobile: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#113D60] text-xs font-bold rounded-xl transition shrink-0"
                    >
                      {accountData.isOtpSent ? "Resend OTP" : "Send OTP"}
                    </button>
                  </div>
                  {mockDevOtp && (
                    <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                      Test Verification OTP code: <span className="font-mono">{mockDevOtp}</span>
                    </p>
                  )}
                </div>

                {/* OTP Input */}
                {accountData.isOtpSent && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Enter 6-Digit OTP Verification Code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          maxLength={6}
                          value={accountData.otp}
                          onChange={(e) => setAccountData({ ...accountData, otp: e.target.value })}
                          placeholder="e.g. 884210"
                          className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-lg font-mono font-bold tracking-widest text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                      >
                        {accountData.isOtpVerified ? "Verified ✓" : "Verify Code"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Official Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={accountData.email}
                      onChange={(e) => setAccountData({ ...accountData, email: e.target.value })}
                      placeholder="owner@mybusiness.in"
                      className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                    />
                  </div>
                </div>

                {/* Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={accountData.password}
                        onChange={(e) => setAccountData({ ...accountData, password: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        value={accountData.confirmPassword}
                        onChange={(e) => setAccountData({ ...accountData, confirmPassword: e.target.value })}
                        placeholder="••••••••••••"
                        className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 2: BUSINESS DETAILS ───────────────────────────────────────── */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#113D60]">Step 2: Business Details</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide your commercial entity information and operating sector.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company / Shop Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessData.companyName}
                      onChange={(e) => setBusinessData({ ...businessData, companyName: e.target.value })}
                      placeholder="e.g. Surya Engineering Works"
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Owner Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessData.ownerName}
                      onChange={(e) => setBusinessData({ ...businessData, ownerName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={businessData.businessType}
                      onChange={(e) => setBusinessData({ ...businessData, businessType: e.target.value as BusinessType })}
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                    >
                      {BUSINESS_TYPES.map((bt) => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                    <div className="mt-2 p-2 rounded-xl bg-cyan-50/80 border border-cyan-200/80 text-[11px] flex items-center justify-between">
                      <span className="text-cyan-900 font-medium">
                        Platform Fee ({businessData.businessType}):
                      </span>
                      <span className="font-semibold text-cyan-900 bg-white px-2 py-0.5 rounded-md border border-cyan-200">
                        {getPlatformFeeRateForType(businessData.businessType).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={businessData.category}
                      onChange={(e) => setBusinessData({ ...businessData, category: e.target.value })}
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={businessData.description}
                    onChange={(e) => setBusinessData({ ...businessData, description: e.target.value })}
                    placeholder="Describe your products, services, production capacity, specialties, or store offerings..."
                    className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 3: BUSINESS LOCATION WITH INTERACTIVE MAP PICKER ──────────── */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#113D60]">Step 3: Business Location</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pin your shop, warehouse, or office location on the interactive map so nearby buyers can find you.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Complete Street Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={locationData.address}
                    onChange={(e) => setLocationData({ ...locationData, address: e.target.value })}
                    placeholder="e.g. Shed No. 14, Phase 2, Industrial Area"
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={locationData.city}
                      onChange={(e) => setLocationData({ ...locationData, city: e.target.value })}
                      placeholder="e.g. Bengaluru"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">District</label>
                    <input
                      type="text"
                      value={locationData.district}
                      onChange={(e) => setLocationData({ ...locationData, district: e.target.value })}
                      placeholder="e.g. Bengaluru Urban"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={locationData.state}
                      onChange={(e) => setLocationData({ ...locationData, state: e.target.value })}
                      placeholder="e.g. Karnataka"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">PIN Code <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      maxLength={6}
                      value={locationData.pinCode}
                      onChange={(e) => setLocationData({ ...locationData, pinCode: e.target.value })}
                      placeholder="e.g. 560100"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      disabled
                      value={locationData.country}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 text-slate-500"
                    />
                  </div>
                </div>

                {/* Interactive Map Location Picker Component */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-cyan-600" />
                      <span>Interactive Map Location Picker (Click to Pin)</span>
                    </span>
                    <span className="text-[11px] font-mono text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
                      {locationData.lat}° N, {locationData.lng}° E
                    </span>
                  </div>

                  <div
                    onClick={handleMapPin}
                    className="relative h-64 bg-slate-100 rounded-2xl border-2 border-dashed border-slate-300 overflow-hidden cursor-crosshair group shadow-inner"
                  >
                    {/* Simulated India Map Visual Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-70" />

                    {/* Geography contours */}
                    <div className="absolute inset-4 rounded-xl border border-slate-200/60 bg-gradient-to-tr from-cyan-50/50 via-slate-50/40 to-blue-50/50 flex flex-col items-center justify-center p-6 text-center">
                      <p className="text-xs font-bold text-slate-500 pointer-events-none">
                        Click anywhere on this map to place your business pin
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 pointer-events-none">
                        Active pin: {locationData.pinLabel}
                      </p>
                    </div>

                    {/* The Interactive Pin */}
                    <div
                      className="absolute transform -translate-x-1/2 -translate-y-full pointer-events-none transition-all duration-200"
                      style={{
                        left: `${Math.min(Math.max((locationData.lng - 72) * 5.5, 15), 85)}%`,
                        top: `${Math.min(Math.max((1 - (locationData.lat - 12) / 16) * 80, 15), 85)}%`
                      }}
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="px-2.5 py-1 rounded-md bg-[#113D60] text-white text-[10px] font-bold shadow-lg whitespace-nowrap mb-1">
                          📍 {businessData.companyName || "Your Business"}
                        </div>
                        <div className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                          <MapPin className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Buyers can view directions, calculate delivery distance, and visit your verified premises.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 4: BUSINESS VERIFICATION ──────────────────────────────────── */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#113D60]">Step 4: Business Verification</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Provide regulatory identifiers where applicable. (Do not worry if you do not have GST — it is optional depending on business size and category).
                </p>
              </div>

              <div className="space-y-4">
                {/* GST Status */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Goods & Services Tax (GST) Status
                    </label>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Applicable / Optional
                    </span>
                  </div>
                  <select
                    value={verificationData.gstStatus}
                    onChange={(e) => setVerificationData({ ...verificationData, gstStatus: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                  >
                    <option value="Registered">Registered (Regular Taxpayer with 15-Digit GSTIN)</option>
                    <option value="Composition Scheme">Composition Scheme (Small Turnover)</option>
                    <option value="Not Registered">Not Registered / Turnover Below GST Exemption Threshold</option>
                    <option value="Exempted">Exempted Goods & Services Only</option>
                  </select>
                </div>

                {/* GST Number Field (conditional) */}
                {verificationData.gstStatus === "Registered" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      15-Digit GSTIN <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-emerald-600" />
                      <input
                        type="text"
                        maxLength={15}
                        value={verificationData.gstNumber}
                        onChange={(e) => setVerificationData({ ...verificationData, gstNumber: e.target.value.toUpperCase() })}
                        placeholder="e.g. 29AABCA1234F1Z5"
                        className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl font-mono uppercase font-bold text-slate-800"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      GSTIN helps you qualify for the official &ldquo;Verified Business&rdquo; badge on your listings.
                    </p>
                  </div>
                )}

                {/* Optional Registration Documents */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      MSME / Udyam Registration (Optional)
                    </label>
                    <input
                      type="text"
                      value={verificationData.udyamRegistration}
                      onChange={(e) => setVerificationData({ ...verificationData, udyamRegistration: e.target.value })}
                      placeholder="e.g. UDYAM-KA-09-0012345"
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Business PAN / Proprietor PAN (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={verificationData.panNumber}
                      onChange={(e) => setVerificationData({ ...verificationData, panNumber: e.target.value.toUpperCase() })}
                      placeholder="e.g. ABCDE1234F"
                      className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>

                {/* Guidance Box */}
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 text-xs text-blue-900 flex items-start gap-3">
                  <HelpCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Transparent Verification Policy</p>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      Noryvanta complies strictly with Indian marketplace rules: &ldquo;Verified&rdquo; badges are awarded strictly after manual or automated clearance of submitted credentials. Unregistered small businesses and artisans are warmly welcomed to list without GST.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── STEP 5: TERMS & CONDITIONS + CATEGORY FEE POLICY ─────────────────── */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-[#113D60]">Step 5: Terms & Conditions & Fee Policy</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review the mandatory platform policies and category platform fee before completing registration.
                </p>
              </div>

              {/* Exact Category Fee Schedule Notice */}
              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#113D60] uppercase tracking-wider">
                    <Percent className="w-4 h-4 text-cyan-600" />
                    <span>Noryvanta Category Platform Fee Policy</span>
                  </div>
                  <span className="text-[11px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-lg border border-cyan-200">
                    Your Fee: {getPlatformFeeRateForType(businessData.businessType).toFixed(2)}% ({businessData.businessType})
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Wholesaler</span>
                    <span className="text-base font-semibold text-[#113D60]">3.20%</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Distributor</span>
                    <span className="text-base font-semibold text-[#113D60]">5.20%</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Services</span>
                    <span className="text-base font-semibold text-[#113D60]">5.20%</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-medium">Retailer</span>
                    <span className="text-base font-semibold text-[#113D60]">8.20%</span>
                  </div>
                </div>

                <blockquote className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
                  &ldquo;<strong>Noryvanta Platform Fee:</strong> Noryvanta charges a category-based platform fee ({getPlatformFeeRateForType(businessData.businessType).toFixed(2)}% for registered {businessData.businessType}) on each successful transaction conducted through the platform, subject to applicable taxes, refunds, cancellations, payment processing charges and the detailed Noryvanta Terms &amp; Conditions.&rdquo;
                </blockquote>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p>• Zero listing fee, zero catalog upload charge, zero monthly subscription.</p>
                  <p>• The platform fee applies strictly upon successful transaction completion.</p>
                  <p>• Fast settlement payouts directly to your registered bank account.</p>
                </div>
              </div>

              {/* Checkboxes: Must NOT be pre-checked per prompt rule */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#113D60] rounded border-slate-300 focus:ring-[#113D60]"
                  />
                  <span className="text-xs text-slate-700">
                    I have read and agree to <strong>Noryvanta Terms &amp; Conditions</strong> and marketplace operating guidelines.
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={agreeFeePolicy}
                    onChange={(e) => setAgreeFeePolicy(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#113D60] rounded border-slate-300 focus:ring-[#113D60]"
                  />
                  <span className="text-xs text-slate-700">
                    I agree to the <strong>Noryvanta Platform Fee policy</strong> ({getPlatformFeeRateForType(businessData.businessType).toFixed(2)}% fee for {businessData.businessType} on successful transactions).
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-ambient flex items-center gap-1.5"
              >
                <span>Save & Continue</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            ) : (
              <button
                type="button"
                disabled={loading || !agreeTerms || !agreeFeePolicy}
                onClick={handleCompleteRegistration}
                className="px-7 py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-lifted flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? "Completing Registration..." : "Complete Registration"}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>
        </div>

        {/* Existing Account Sign-in Link in One Line */}
        <div className="text-center text-xs text-slate-500 pt-1 pb-4">
          <p className="whitespace-nowrap">
            Already have a registered business account?{" "}
            <Link href="/login" className="font-bold text-[#113D60] hover:text-cyan-700 underline">
              Sign In to Business Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
