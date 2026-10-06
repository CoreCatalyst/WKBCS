"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { usePaymentGateway } from "@/contexts/PaymentGatewayContext";
import { useCountry } from "@/contexts/CountryContext";
import {
  ListingItem,
  TransactionRecord,
  BusinessType,
  BUSINESS_TYPES,
  calculatePlatformFee,
  getPlatformFeeRateForType
} from "@/lib/marketplaceData";
import {
  LayoutDashboard,
  Building2,
  Package,
  PlusCircle,
  ShoppingBag,
  ArrowLeftRight,
  TrendingUp,
  Users,
  Briefcase,
  Star,
  Megaphone,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Percent,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Copy,
  Edit,
  Eye,
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Check,
  RotateCcw,
  Sliders,
  DollarSign,
  X,
  Lock,
  Award,
  Video,
  Film,
  Play,
  Loader2,
  ReceiptText
} from "lucide-react";
import { NetworkProgressTracker } from "@/components/network/NetworkProgressTracker";
import {
  LISTING_MEDIA_RULES,
  MediaItem,
  UploadState,
  ProcessingState,
  validateImageFile,
  validateVideoFile,
  isMediaReady
} from "@/lib/listingMediaRules";

// Sidebar navigation items
const SIDEBAR_ITEMS: Array<{
  id: string;
  label: string;
  icon: any;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Business Profile", icon: Building2 },
  { id: "products-services", label: "Products & Services", icon: Package },
  { id: "add-listing", label: "Add Product / Service", icon: PlusCircle },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "network-progress", label: "Network Progress", icon: Award },
  { id: "customers", label: "Customers", icon: Users },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "promotions", label: "Promotions", icon: Megaphone },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help-support", label: "Help & Support", icon: HelpCircle },
];

function DashboardMainContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "dashboard";

  const {
    currentBusiness,
    updateBusiness,
    listings,
    addListing,
    updateListing,
    deleteListing,
    duplicateListing,
    togglePublishListing,
    transactions,
    categories
  } = useMarketplace();

  const {
    businessPaymentSettings,
    updateBusinessPaymentSettings,
    toggleBusinessPaymentMethod
  } = usePaymentGateway();

  const { country, formatPrice } = useCountry();

  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab with URL if param changes
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Filter listings belonging to this business (or all demo listings)
  const businessListings = listings.filter(
    (l) => l.businessId === currentBusiness.id || l.businessName.includes("Apex")
  );

  // Filter transactions belonging to this business
  const businessTransactions = transactions.filter(
    (t) => t.businessId === currentBusiness.id || t.businessName.includes("Apex")
  );

  // Financial calculations for this registered business category
  const calculatedGross = businessTransactions.reduce((acc, t) => acc + (t.status === "Successful" ? t.grossAmount : 0), 0);
  const grossSales = calculatedGross > 0 ? calculatedGross : 248000;
  const calculatedTxns = businessTransactions.filter((t) => t.status === "Successful").length;
  const successfulTxnCount = calculatedTxns > 0 ? calculatedTxns : 42;
  const feeRatePercent = getPlatformFeeRateForType(currentBusiness.businessType);
  const calculatedFees = businessTransactions.reduce((acc, t) => acc + (t.status === "Successful" ? t.platformFeeAmount : 0), 0);
  const platformFees = calculatedFees > 0 ? calculatedFees : Math.round(grossSales * (feeRatePercent / 100));
  const refundsAdjustments = 3200; // Refunds / Adjustments = ₹3,200
  const netAmount = grossSales - platformFees - refundsAdjustments;
  const pendingPayments = businessTransactions.reduce((acc, t) => acc + (t.status === "Pending" ? t.grossAmount : 0), 0) || 49000;

  // Section 3 & 6 state
  const [feeTermsAgreed, setFeeTermsAgreed] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedTransactionDetail, setSelectedTransactionDetail] = useState<TransactionRecord | null>(null);

  // Active listings count
  const activeListingsCount = businessListings.filter((l) => l.status === "Published").length;
  const totalListingsCount = businessListings.length;

  // -------------------------------------------------------------
  // SECTION 5: PRODUCTS & SERVICES STATE
  // -------------------------------------------------------------
  const [listingFilterTab, setListingFilterTab] = useState<"All" | "Products" | "Services" | "Draft" | "Pending Review" | "Published" | "Inactive">("All");

  const filteredManagementListings = businessListings.filter((item) => {
    if (listingFilterTab === "All") return true;
    if (listingFilterTab === "Products") return item.type === "Product";
    if (listingFilterTab === "Services") return item.type === "Service";
    return item.status === listingFilterTab;
  });

  // -------------------------------------------------------------
  // SECTION 6, 7, 8, 9: ADD PRODUCT / SERVICE MULTI-STEP CREATION
  // -------------------------------------------------------------
  const [creatorStep, setCreatorStep] = useState<1 | 2 | 3 | 4>(1);
  const [listingType, setListingType] = useState<"Product" | "Service">("Product");

  // Step 2: Upload Media Items (Minimum 4 images mandatory, Max 10; Max 2 videos optional)
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([
    {
      id: "media-img-1",
      url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80",
      originalFilename: "actuator-primary-800x800.jpg",
      originalSize: 1204000,
      mimeType: "image/jpeg",
      type: "IMAGE",
      uploadState: "UPLOADED",
      processingState: "READY",
      width: 1200,
      height: 1200,
      isPrimary: true
    },
    {
      id: "media-img-2",
      url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
      originalFilename: "actuator-side-view.jpg",
      originalSize: 980000,
      mimeType: "image/jpeg",
      type: "IMAGE",
      uploadState: "UPLOADED",
      processingState: "READY",
      width: 1200,
      height: 1200
    },
    {
      id: "media-img-3",
      url: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
      originalFilename: "actuator-schematic.jpg",
      originalSize: 1105000,
      mimeType: "image/jpeg",
      type: "IMAGE",
      uploadState: "UPLOADED",
      processingState: "READY",
      width: 1200,
      height: 1200
    },
    {
      id: "media-img-4",
      url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80",
      originalFilename: "actuator-connector.jpg",
      originalSize: 890000,
      mimeType: "image/jpeg",
      type: "IMAGE",
      uploadState: "UPLOADED",
      processingState: "READY",
      width: 1200,
      height: 1200
    }
  ]);
  const [primaryImageIdx, setPrimaryImageIdx] = useState(0);
  const [replacementTargetId, setReplacementTargetId] = useState<string | null>(null);
  const [mediaNotice, setMediaNotice] = useState<string | null>(null);

  // Ready media items
  const readyImages = mediaItems.filter(m => m.type === "IMAGE" && isMediaReady(m));
  const readyVideos = mediaItems.filter(m => m.type === "VIDEO" && isMediaReady(m));
  const uploadedImages = readyImages.map(m => m.url);
  const uploadedVideos = readyVideos.map(m => m.url);

  // Step 3: Description Mode ("AI" vs "MANUAL")
  const [descMode, setDescMode] = useState<"AI" | "MANUAL">("AI");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiAccepted, setAiAccepted] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    title: string;
    shortDescription: string;
    detailedDescription: string;
    keyFeatures: string[];
    price: number;
    unit: string;
    availability: "In Stock" | "Available on Order" | "Active" | "Temporarily Unavailable";
    category: string;
    subcategory: string;
    keywords: string[];
    specifications: Record<string, string>;
  }>({
    title: "Precision Micro-Stepper Actuator IP65 (Automated Series)",
    shortDescription: "Ultra-compact high-torque micro actuator engineered for automated medical diagnostic robots and precision optical positioning.",
    detailedDescription: "Industrial grade continuous duty micro-actuator built with dual brushless bearings and high-resolution optical encoder. Resistant to abrasive environments.",
    keyFeatures: [
      "Ultra-low backlash < 0.05 arcmin with high torque density",
      "Integrated 20-bit absolute optical encoder for sub-micron accuracy",
      "IP65 waterproof and dustproof sealed aluminum body",
      "Direct compatible plug-and-play with MODBUS and CANopen controllers"
    ],
    price: 18500,
    unit: "Unit",
    availability: "In Stock",
    category: "Manufacturing",
    subcategory: "Robotics & Automation",
    keywords: ["micro stepper", "precision actuator", "robotics motor", "ip65 actuator", "cnc components"],
    specifications: {
      "Operating Voltage": "24V - 48V DC",
      "Rated Torque": "4.2 Nm",
      "Weight": "650 grams",
      "Operating Temp": "-10°C to +65°C"
    }
  });

  const [creatorError, setCreatorError] = useState("");
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  // AI Description Generator logic (enforces strict AI rule: no invented specs/prices)
  const handleGenerateWithAi = () => {
    setAiGenerating(true);
    setCreatorError("");
    setTimeout(() => {
      setAiGenerating(false);
      setFormData((prev) => ({
        ...prev,
        title: listingType === "Product"
          ? "Industrial High-Torque Precision Servo Actuator IP65"
          : "Professional Turnkey Industrial Automation Calibration Service",
        shortDescription: listingType === "Product"
          ? "Heavy-duty continuous precision motor engineered for automated assembly lines, pick-and-place robots, and CNC tooling."
          : "NABL certified on-site robotic alignment and multi-axis calibration services with certified compliance report within 24 hours.",
        keyFeatures: [
          "Robust die-cast aluminum frame with high thermal dissipation fins",
          "Ultra-low vibration harmonics for continuous 24/7 duty cycle",
          "Standardized industrial mounting flanges compatible with major controllers",
          "Engineered for harsh workshop conditions with ingress protection"
        ],
        keywords: [
          listingType === "Product" ? "precision actuator" : "calibration service",
          "industrial automation",
          "quality certified",
          "heavy duty",
          "b2b supplies"
        ],
        specifications: {
          "Operating Dimensions": "Please provide this information manually.",
          "Power Specifications": "Please provide this information manually.",
          "Warranty & Certifications": "Please provide this information manually."
        }
      }));
    }, 1200);
  };

  // Image manipulation helpers
  const handleAddSampleImage = () => {
    if (readyImages.length >= 10) {
      setCreatorError("Maximum 10 images allowed per listing.");
      return;
    }
    setCreatorError("");
    setMediaNotice(null);
    const samples = [
      "https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80"
    ];
    const newId = `img-sample-${Date.now()}`;
    const picked = samples[mediaItems.length % samples.length];
    
    // Simulate upload & processing states
    const newItem: MediaItem = {
      id: newId,
      url: picked,
      originalFilename: `sample-product-image-${mediaItems.length + 1}.jpg`,
      originalSize: 1048576,
      mimeType: "image/jpeg",
      type: "IMAGE",
      uploadState: "UPLOADING",
      processingState: "NOT_STARTED",
      uploadProgress: 45,
      width: 1200,
      height: 1200
    };
    
    setMediaItems(prev => [...prev, newItem]);

    setTimeout(() => {
      setMediaItems(prev =>
        prev.map(m =>
          m.id === newId
            ? { ...m, uploadState: "UPLOADED", uploadProgress: 100, processingState: "PROCESSING", processingProgress: 50 }
            : m
        )
      );
      setTimeout(() => {
        setMediaItems(prev =>
          prev.map(m =>
            m.id === newId
              ? { ...m, processingState: "READY", processingProgress: 100 }
              : m
          )
        );
      }, 400);
    }, 400);
  };

  const handleAddSampleVideo = () => {
    if (readyVideos.length >= 2) {
      setCreatorError("Maximum 2 video clips allowed per listing.");
      return;
    }
    setCreatorError("");
    setMediaNotice(null);
    const newId = `vid-sample-${Date.now()}`;
    const sampleVideoUrl = "https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-and-technology-elements-43187-large.mp4";

    const newItem: MediaItem = {
      id: newId,
      url: sampleVideoUrl,
      originalFilename: `sample-product-demo-${readyVideos.length + 1}.mp4`,
      originalSize: 12582912, // 12 MB (strictly under 20 MB limit)
      mimeType: "video/mp4",
      type: "VIDEO",
      duration: 18, // 18 seconds (under 30s limit)
      uploadState: "UPLOADING",
      processingState: "NOT_STARTED",
      uploadProgress: 35
    };

    setMediaItems(prev => [...prev, newItem]);

    setTimeout(() => {
      setMediaItems(prev =>
        prev.map(m =>
          m.id === newId
            ? { ...m, uploadState: "UPLOADED", uploadProgress: 100, processingState: "PROCESSING", processingProgress: 50 }
            : m
        )
      );
      setTimeout(() => {
        setMediaItems(prev =>
          prev.map(m =>
            m.id === newId
              ? { ...m, processingState: "READY", processingProgress: 100 }
              : m
          )
        );
      }, 500);
    }, 500);
  };

  // Safe Deletion: When at 4 images, block deletion and require replacement
  const handleDeleteMedia = (id: string) => {
    const target = mediaItems.find(m => m.id === id);
    if (!target) return;

    if (target.type === "IMAGE" && readyImages.length <= 4) {
      setMediaNotice("At least 4 images are required. Upload a replacement image before deleting this image.");
      setCreatorError("At least 4 images are required. Upload a replacement image before deleting this image.");
      return;
    }

    setMediaNotice(null);
    setCreatorError("");
    setMediaItems(prev => prev.filter(m => m.id !== id));
    if (primaryImageIdx >= readyImages.length - 1) {
      setPrimaryImageIdx(0);
    }
  };

  // Real file input handlers with rigorous validation
  const handleImageUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = await validateImageFile(file, mediaItems);
    if (!validation.valid) {
      setCreatorError(validation.error || "Invalid image file.");
      e.target.value = "";
      return;
    }

    if (readyImages.length >= 10 && !replacementTargetId) {
      setCreatorError("Maximum 10 images allowed per listing.");
      e.target.value = "";
      return;
    }

    setCreatorError("");
    setMediaNotice(null);
    const objectUrl = URL.createObjectURL(file);
    const newId = `img-user-${Date.now()}`;

    if (replacementTargetId) {
      // 1-for-1 replacement: add new item while keeping old until new is READY
      const currentTarget = mediaItems.find(m => m.id === replacementTargetId);
      const replacementItem: MediaItem = {
        id: newId,
        url: objectUrl,
        originalFilename: file.name,
        originalSize: file.size,
        mimeType: file.type,
        type: "IMAGE",
        uploadState: "UPLOADING",
        processingState: "NOT_STARTED",
        width: validation.width,
        height: validation.height,
        uploadProgress: 50
      };

      setMediaItems(prev => [...prev, replacementItem]);
      setTimeout(() => {
        setMediaItems(prev =>
          prev
            .filter(m => m.id !== replacementTargetId) // safe replacement finalized
            .map(m =>
              m.id === newId
                ? { ...m, uploadState: "UPLOADED", processingState: "READY", uploadProgress: 100, processingProgress: 100 }
                : m
            )
        );
        setReplacementTargetId(null);
      }, 600);
    } else {
      const newItem: MediaItem = {
        id: newId,
        url: objectUrl,
        originalFilename: file.name,
        originalSize: file.size,
        mimeType: file.type,
        type: "IMAGE",
        uploadState: "UPLOADING",
        processingState: "NOT_STARTED",
        width: validation.width,
        height: validation.height,
        uploadProgress: 50
      };

      setMediaItems(prev => [...prev, newItem]);
      setTimeout(() => {
        setMediaItems(prev =>
          prev.map(m =>
            m.id === newId
              ? { ...m, uploadState: "UPLOADED", processingState: "READY", uploadProgress: 100, processingProgress: 100 }
              : m
          )
        );
      }, 600);
    }

    e.target.value = "";
  };

  const handleVideoUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = await validateVideoFile(file, mediaItems);
    if (!validation.valid) {
      setCreatorError(validation.error || "Invalid video file.");
      e.target.value = "";
      return;
    }

    if (readyVideos.length >= 2 && !replacementTargetId) {
      setCreatorError("Maximum 2 videos allowed per listing.");
      e.target.value = "";
      return;
    }

    setCreatorError("");
    setMediaNotice(null);
    const objectUrl = URL.createObjectURL(file);
    const newId = `vid-user-${Date.now()}`;

    const newItem: MediaItem = {
      id: newId,
      url: objectUrl,
      originalFilename: file.name,
      originalSize: file.size,
      mimeType: file.type,
      type: "VIDEO",
      duration: validation.duration,
      uploadState: "UPLOADING",
      processingState: "NOT_STARTED",
      uploadProgress: 40
    };

    setMediaItems(prev => [...prev, newItem]);
    setTimeout(() => {
      setMediaItems(prev =>
        prev.map(m =>
          m.id === newId
            ? { ...m, uploadState: "UPLOADED", processingState: "READY", uploadProgress: 100, processingProgress: 100 }
            : m
        )
      );
    }, 700);

    e.target.value = "";
  };

  // Final Publish Handler (Enforcing 4-10 images & max 2 videos)
  const handlePublishListing = (status: "Published" | "Draft" | "Pending Review") => {
    if (readyImages.length < 4) {
      setCreatorError("Minimum 4 images required before publishing! Please upload at least 4 images.");
      setCreatorStep(2);
      return;
    }
    if (readyImages.length > 10) {
      setCreatorError("Maximum 10 images allowed per listing. Please remove excess images.");
      setCreatorStep(2);
      return;
    }
    if (readyVideos.length > 2) {
      setCreatorError("Maximum 2 videos allowed per listing. Please remove excess videos.");
      setCreatorStep(2);
      return;
    }

    if (status === "Published" && !feeTermsAgreed) {
      setCreatorError("You must acknowledge and agree to the Noryvanta Platform Fee Terms & Conditions before publishing.");
      return;
    }

    addListing({
      type: listingType,
      title: formData.title,
      shortDescription: formData.shortDescription,
      detailedDescription: formData.detailedDescription,
      keyFeatures: formData.keyFeatures,
      category: formData.category,
      subcategory: formData.subcategory,
      price: formData.price,
      unit: formData.unit,
      availability: formData.availability,
      images: uploadedImages,
      videos: uploadedVideos,
      primaryImageIndex: primaryImageIdx,
      keywords: formData.keywords,
      specifications: formData.specifications,
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      businessCity: currentBusiness.city,
      businessState: currentBusiness.state,
      businessVerified: currentBusiness.isVerified,
      status
    });

    setPublishedSuccess(true);
    setTimeout(() => {
      setPublishedSuccess(false);
      setActiveTab("products-services");
      setCreatorStep(1);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* ─── SIDEBAR (Responsive on all screens) ─────────────────────────── */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200/90 shrink-0 p-3 sm:p-4 space-y-4 lg:space-y-6">
        {/* Business Identifier Pill */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center justify-between lg:justify-start gap-3 shadow-2xs">
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={currentBusiness.logo}
              alt={currentBusiness.name}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover border border-slate-200 shrink-0"
            />
            <div className="overflow-hidden">
              <h3 className="text-xs font-bold text-[#113D60] truncate">
                {currentBusiness.name}
              </h3>
              <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{currentBusiness.businessType}</span>
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="lg:hidden text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>

        {/* Navigation List: Horizontal scroll on mobile, vertical stack on desktop */}
        <nav className="flex lg:flex-col overflow-x-auto lg:overflow-visible pb-1.5 lg:pb-0 gap-1.5 scrollbar-none">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  router.push(`/dashboard?tab=${item.id}`);
                }}
                className={`flex items-center gap-2.5 px-3.5 py-2 lg:py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 lg:w-full whitespace-nowrap cursor-pointer border ${
                  isActive
                    ? "bg-[#113D60] text-white border-cyan-500/60 shadow-xs"
                    : "text-slate-600 hover:text-[#113D60] hover:bg-slate-100/80 border-transparent hover:border-slate-200/80"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Desktop Logout */}
        <div className="hidden lg:block pt-4 border-t border-slate-200">
          <Link
            href="/login"
            className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-red-600 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-8 space-y-8 overflow-y-auto">
        {/* Top Header Section required by Section 4 */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[#113D60] tracking-tight">
                Welcome back, {currentBusiness.name}
              </h1>
              {currentBusiness.isVerified && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Business
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Noryvanta Business Dashboard • Real-time listings, escrow orders, and category platform fee settlements.
            </p>
          </div>

          {/* Profile Completion Indicator required by Section 4 */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 min-w-[260px]">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-[#113D60]">Business Profile 80% Complete</span>
              <span className="text-[11px] text-cyan-700 font-semibold">80%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div className="bg-gradient-to-r from-cyan-500 to-[#113D60] h-full rounded-full w-[80%]" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 flex items-center justify-between">
              <span>Next: Add bank IFSC for payouts</span>
              <button
                onClick={() => setActiveTab("profile")}
                className="text-cyan-700 font-medium hover:underline"
              >
                Complete Now →
              </button>
            </p>
          </div>
        </div>

        {/* ─── TAB: DASHBOARD OVERVIEW ────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* 8 Metric KPI Cards required by Section 4 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* 1. Total Products/Services */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-[#113D60]">{totalListingsCount}</p>
                  <p className="text-xs text-slate-500 font-medium">Total Products/Services</p>
                </div>
              </div>

              {/* 2. Active Listings */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-[#113D60]">{activeListingsCount}</p>
                  <p className="text-xs text-slate-500 font-medium">Active Listings</p>
                </div>
              </div>

              {/* 3. Orders */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-[#113D60]">{businessTransactions.length}</p>
                  <p className="text-xs text-slate-500 font-medium">Orders Received</p>
                </div>
              </div>

              {/* 4. Successful Transactions */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-emerald-700">{successfulTxnCount}</p>
                  <p className="text-xs text-slate-500 font-medium">Successful Transactions</p>
                </div>
              </div>

              {/* 5. Gross Sales */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-[#113D60]">{formatPrice(grossSales)}</p>
                  <p className="text-xs text-slate-500 font-medium">Gross Sales</p>
                </div>
              </div>

              {/* 6. Noryvanta Platform Fees */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <Percent className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-amber-700">{formatPrice(platformFees)}</p>
                  <p className="text-xs text-slate-500 font-medium">Platform Fees ({feeRatePercent.toFixed(2)}%)</p>
                </div>
              </div>

              {/* 7. Net Amount */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-emerald-700">{formatPrice(netAmount)}</p>
                  <p className="text-xs text-slate-500 font-medium">Net Payouts</p>
                </div>
              </div>

              {/* 8. Pending Payments */}
              <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-semibold text-slate-700">{formatPrice(pendingPayments)}</p>
                  <p className="text-xs text-slate-500 font-medium">Pending Payments</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#113D60]">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveTab("add-listing")}
                    className="w-full py-3 px-4 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <PlusCircle className="w-4 h-4 text-cyan-400" />
                      <span>Add New Product / Service</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab("products-services")}
                    className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-cyan-600" />
                      <span>Manage Existing Listings ({totalListingsCount})</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab("earnings")}
                    className="w-full py-3 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/70">
                        <ReceiptText className="w-3.5 h-3.5" />
                      </div>
                      <span>View Earning Ledger</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setActiveTab("network-progress")}
                    className="w-full py-3 px-4 bg-amber-50/80 hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-xl transition flex items-center justify-between border border-amber-200"
                  >
                    <span className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-amber-700" />
                      <span>Network Progress (Level 37 • Gold)</span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-700" />
                  </button>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="lg:col-span-2 min-w-0 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#113D60]">Recent Commercial Orders</h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-cyan-700 hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Customer</th>
                        <th className="pb-3">Item</th>
                        <th className="pb-3">Gross</th>
                        <th className="pb-3">Platform Fee</th>
                        <th className="pb-3">Net</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {businessTransactions.slice(0, 4).map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50 transition">
                          <td className="py-3 font-mono font-bold text-[#113D60]">{t.orderId}</td>
                          <td className="py-3 font-medium text-slate-700 truncate max-w-[120px]">{t.customerName}</td>
                          <td className="py-3 text-slate-600 truncate max-w-[150px]">{t.itemTitle}</td>
                          <td className="py-3 font-bold text-slate-800">{formatPrice(t.grossAmount)}</td>
                          <td className="py-3 text-amber-700 font-semibold">-{formatPrice(t.platformFeeAmount)}</td>
                          <td className="py-3 font-bold text-emerald-700">{formatPrice(t.netSettlement)}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                t.status === "Successful"
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTransactionDetail(t)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-[#113D60] text-slate-700 hover:text-white rounded-lg text-[10px] font-bold transition"
                            >
                              Breakdown
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: NETWORK PROGRESS TRACKER (SECTION 1-21) ────────────────────── */}
        {activeTab === "network-progress" && (
          <div className="space-y-6">
            <NetworkProgressTracker />
          </div>
        )}

        {/* ─── TAB: PRODUCTS & SERVICES (SECTION 5) ───────────────────────────── */}
        {activeTab === "products-services" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold font-headline text-[#113D60]">
                  Products & Services Management
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage active listings, draft edits, publish toggles, and view performance metrics.
                </p>
              </div>

              {/* Exact Primary Button from Section 5 */}
              <button
                onClick={() => setActiveTab("add-listing")}
                className="px-5 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center gap-1.5 self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>+ Add Product / Service</span>
              </button>
            </div>

            {/* Exact Tabs from Section 5: All, Products, Services, Draft, Pending Review, Published, Inactive */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-200">
              {(["All", "Products", "Services", "Draft", "Pending Review", "Published", "Inactive"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setListingFilterTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    listingFilterTab === tab
                      ? "bg-[#113D60] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Listing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredManagementListings.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lifted transition flex flex-col justify-between overflow-hidden"
                >
                  <div>
                    {/* Main Image */}
                    <div className="h-48 bg-slate-100 relative overflow-hidden">
                      <img
                        src={item.images[item.primaryImageIndex] || item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/95 text-[#113D60] shadow-sm">
                          {item.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.status === "Published"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : item.status === "Pending Review"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <p className="text-[11px] font-medium text-cyan-700">{item.category}</p>
                      <h3 className="font-semibold text-sm text-[#113D60] line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-base font-semibold text-[#113D60]">
                        {formatPrice(item.price)}
                        <span className="text-xs font-normal text-slate-500 ml-1">/ {item.unit}</span>
                      </p>

                      {/* Views & Orders counters */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.views} Views</span>
                        </span>
                        <span className="flex items-center gap-1 justify-end font-semibold text-slate-700">
                          <ShoppingBag className="w-3.5 h-3.5 text-cyan-600" />
                          <span>{item.orders} Orders</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Required Action Buttons from Section 5: Edit, Duplicate, Delete, Publish/Unpublish */}
                  <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-1">
                    <button
                      onClick={() => {
                        // Prefill edit
                        setFormData({
                          title: item.title,
                          shortDescription: item.shortDescription,
                          detailedDescription: item.detailedDescription,
                          keyFeatures: item.keyFeatures,
                          price: item.price,
                          unit: item.unit,
                          availability: item.availability,
                          category: item.category,
                          subcategory: item.subcategory || "",
                          keywords: item.keywords,
                          specifications: item.specifications
                        });
                        const initialMedia: MediaItem[] = [
                          ...item.images.map((imgUrl, i) => ({
                            id: `img-edit-${i}`,
                            url: imgUrl,
                            originalFilename: `image-${i + 1}.jpg`,
                            originalSize: 1024000,
                            mimeType: "image/jpeg",
                            type: "IMAGE" as const,
                            uploadState: "UPLOADED" as const,
                            processingState: "READY" as const,
                            isPrimary: i === (item.primaryImageIndex || 0)
                          })),
                          ...(item.videos || []).map((vidUrl, i) => ({
                            id: `vid-edit-${i}`,
                            url: vidUrl,
                            originalFilename: `video-demo-${i + 1}.mp4`,
                            originalSize: 12000000,
                            mimeType: "video/mp4",
                            type: "VIDEO" as const,
                            uploadState: "UPLOADED" as const,
                            processingState: "READY" as const,
                            duration: 20
                          }))
                        ];
                        setMediaItems(initialMedia);
                        setActiveTab("add-listing");
                        setCreatorStep(3);
                      }}
                      className="p-2 text-slate-600 hover:text-[#113D60] hover:bg-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Edit"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => duplicateListing(item.id)}
                      className="p-2 text-slate-600 hover:text-cyan-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </button>

                    <button
                      onClick={() => togglePublishListing(item.id)}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition ${
                        item.status === "Published"
                          ? "text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                          : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                      }`}
                    >
                      {item.status === "Published" ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => deleteListing(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB: ADD PRODUCT / SERVICE (SECTIONS 6, 7, 8, 9) ───────────────── */}
        {activeTab === "add-listing" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold font-headline text-[#113D60]">
                Create Listing (Product or Service)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload 4 to 10 verified photos (plus up to 2 optional video clips), generate high-converting descriptions with Noryvanta AI, and preview before publishing.
              </p>
            </div>

            {/* Stepper Navigation */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { step: 1, label: "1. Listing Type" },
                  { step: 2, label: "2. Media (4-10 Photos)" },
                  { step: 3, label: "3. AI / Manual Content" },
                  { step: 4, label: "4. Preview & Publish" },
                ].map((s) => (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setCreatorStep(s.step as any)}
                    className={`py-2 rounded-xl font-bold transition ${
                      creatorStep === s.step
                        ? "bg-[#113D60] text-white shadow-xs"
                        : creatorStep > s.step
                        ? "text-emerald-700 bg-emerald-50"
                        : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {creatorError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{creatorError}</span>
              </div>
            )}

            {publishedSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-bold">Listing Published Successfully!</p>
                  <p className="text-[11px] text-emerald-700">Redirecting to listings manager...</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
              {/* ─── STEP 1: SELECT LISTING TYPE ─────────────────────────────── */}
              {creatorStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[#113D60]">Select Listing Type</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Specify whether you are listing a tangible physical product or an on-demand commercial service.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                      onClick={() => setListingType("Product")}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center space-y-3 ${
                        listingType === "Product"
                          ? "border-[#113D60] bg-slate-50 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center">
                        <Package className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#113D60]">Product</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Tangible manufactured goods, electronics, raw materials, commodities, or wholesale inventory.
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-cyan-700 bg-white px-2.5 py-1 rounded-full border border-cyan-200">
                        Units, MOQ & Shipping Enabled
                      </span>
                    </div>

                    <div
                      onClick={() => setListingType("Service")}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition flex flex-col items-center text-center space-y-3 ${
                        listingType === "Service"
                          ? "border-[#113D60] bg-slate-50 shadow-md"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Briefcase className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#113D60]">Service</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          Professional contracting, construction, repairs, IT solutions, diagnostics, or consultancy.
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200">
                        Inquiries & Milestone Escrow
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(2)}
                      className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Continue to Upload Images</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: UPLOAD MEDIA (4-10 IMAGES MANDATORY · 0-2 VIDEOS OPTIONAL) ─────── */}
              {creatorStep === 2 && (
                <div className="space-y-6">
                  {/* Media Requirements Header & Live Status */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-[#113D60] flex items-center gap-2">
                          <span>Listing Media Assets</span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            Min 4 Images · Max 10 Images · Up to 2 Videos
                          </span>
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          Photos must be JPG, PNG, or WEBP (Max 5MB each, min 800×800). Optional video clips max 20MB &amp; 30s.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Image Counter Badge */}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                            readyImages.length >= 4 && readyImages.length <= 10
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>
                            {readyImages.length} / 10 Images {readyImages.length >= 4 ? "(Valid ✓)" : "(Need 4+)"}
                          </span>
                        </div>

                        {/* Video Counter Badge */}
                        <div
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
                            readyVideos.length <= 2
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>{readyVideos.length} / 2 Videos (Optional)</span>
                        </div>
                      </div>
                    </div>

                    {mediaNotice && (
                      <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>{mediaNotice}</span>
                      </div>
                    )}
                  </div>

                  {/* Hidden File Inputs for real user uploads */}
                  <input
                    id="media-image-file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUploadFile}
                  />
                  <input
                    id="media-video-file-input"
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={handleVideoUploadFile}
                  />

                  {/* ─── SECTION A: PRODUCT & SERVICE IMAGES (4-10) ─────────────── */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-4 h-4 text-cyan-700" />
                        <h4 className="text-sm font-bold text-[#113D60]">
                          Product Images ({readyImages.length} of 10)
                        </h4>
                        <span className="text-[11px] text-red-600 font-semibold">* Minimum 4 mandatory</span>
                      </div>

                      <div className="flex gap-2">
                        <label
                          htmlFor="media-image-file-input"
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl cursor-pointer transition flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Upload Image</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddSampleImage}
                          className="px-3 py-1.5 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-cyan-700" />
                          <span>Add Sample Photo</span>
                        </button>
                      </div>
                    </div>

                    {/* Image Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {mediaItems.filter(m => m.type === "IMAGE").map((item, idx) => {
                        const isPrimary = primaryImageIdx === idx;
                        const isReady = isMediaReady(item);
                        return (
                          <div
                            key={item.id}
                            className={`relative h-40 rounded-2xl border-2 overflow-hidden flex flex-col justify-between transition group bg-slate-900 ${
                              isPrimary
                                ? "border-cyan-500 ring-2 ring-cyan-200"
                                : isReady
                                ? "border-slate-200"
                                : "border-amber-300 bg-amber-50/50"
                            }`}
                          >
                            <img
                              src={item.url}
                              alt={item.originalFilename}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />

                            {/* Overlay Badges */}
                            <div className="absolute top-1.5 inset-x-1.5 flex justify-between items-center pointer-events-none">
                              <span className="bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                                {isPrimary ? "★ Primary" : `Photo ${idx + 1}`}
                              </span>
                              {isReady ? (
                                <span className="bg-emerald-600/90 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-xs">
                                  Ready
                                </span>
                              ) : (
                                <span className="bg-amber-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                  <span>{item.uploadState === "UPLOADING" ? "Uploading" : "Processing"}</span>
                                </span>
                              )}
                            </div>

                            {/* Upload/Processing Progress Bar */}
                            {!isReady && (
                              <div className="absolute inset-x-2 bottom-12 bg-black/60 p-2 rounded-lg backdrop-blur-xs text-center">
                                <p className="text-[10px] font-semibold text-white mb-1">
                                  {item.uploadState === "UPLOADING" ? "Uploading File..." : "Optimizing Resolution..."}
                                </p>
                                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${item.uploadProgress || item.processingProgress || 60}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Action Buttons on Hover */}
                            <div className="absolute inset-x-1.5 bottom-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition duration-200">
                              <button
                                type="button"
                                onClick={() => setPrimaryImageIdx(idx)}
                                className="flex-1 py-1 text-[10px] font-bold bg-white/95 hover:bg-white text-[#113D60] rounded shadow-xs text-center transition"
                              >
                                Set Primary
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReplacementTargetId(item.id);
                                  document.getElementById("media-image-file-input")?.click();
                                }}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-900/90 hover:bg-black text-white rounded shadow-xs transition"
                                title="1-for-1 Safe Replace"
                              >
                                Replace
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteMedia(item.id)}
                                className="p-1 bg-red-600/90 hover:bg-red-700 text-white rounded shadow-xs transition"
                                title="Delete Image"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Slot Placeholder if < 10 */}
                      {mediaItems.filter(m => m.type === "IMAGE").length < 10 && (
                        <label
                          htmlFor="media-image-file-input"
                          className="h-40 rounded-2xl border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/30 cursor-pointer flex flex-col items-center justify-center p-3 text-center transition group"
                        >
                          <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 group-hover:border-cyan-300 flex items-center justify-center mb-1 text-slate-400 group-hover:text-cyan-600 transition">
                            <PlusCircle className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-700 group-hover:text-cyan-700">Add Photo</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Max 5MB)</span>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* ─── SECTION B: OPTIONAL SHORT VIDEO CLIPS (0-2) ─────────────── */}
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Film className="w-4 h-4 text-cyan-700" />
                        <h4 className="text-sm font-bold text-[#113D60]">
                          Short Video Clips ({readyVideos.length} of 2)
                        </h4>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Optional · Does not count toward 4-image requirement
                        </span>
                      </div>

                      <div className="flex gap-2">
                        <label
                          htmlFor="media-video-file-input"
                          className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 rounded-xl cursor-pointer transition flex items-center gap-1.5"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-600" />
                          <span>Upload Video (Max 20MB)</span>
                        </label>
                        <button
                          type="button"
                          onClick={handleAddSampleVideo}
                          disabled={readyVideos.length >= 2}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-800 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 text-blue-700" />
                          <span>Add Sample Clip</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500">
                      Upload up to 2 high-impact product demo clips. Hard upload limit: 20MB per clip, maximum duration 30 seconds.
                    </p>

                    {/* Video Cards Grid */}
                    {mediaItems.filter(m => m.type === "VIDEO").length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {mediaItems.filter(m => m.type === "VIDEO").map((vItem, vIdx) => {
                          const isReady = isMediaReady(vItem);
                          return (
                            <div
                              key={vItem.id}
                              className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 group"
                            >
                              <video
                                src={vItem.url}
                                controls
                                muted
                                className="w-full h-44 object-cover"
                              />

                              <div className="p-3 bg-white border-t border-slate-100 flex items-center justify-between">
                                <div>
                                  <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                                    {vItem.originalFilename}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500 font-medium">
                                      {(vItem.originalSize / (1024 * 1024)).toFixed(1)} MB · {vItem.duration || 15}s
                                    </span>
                                    {isReady ? (
                                      <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                        Ready
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                        <span>Optimizing</span>
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMedia(vItem.id)}
                                  className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                                  title="Delete Video"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-5 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center">
                        <Film className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-slate-600">No video clips attached</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Adding short 15–30s product demo clips increases customer conversion by up to 45%.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Navigation controls */}
                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(1)}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (readyImages.length < 4) {
                          setCreatorError("Minimum 4 images required before proceeding. Please upload at least 4 valid images.");
                          return;
                        }
                        if (readyImages.length > 10) {
                          setCreatorError("Maximum 10 images allowed. Please remove excess images.");
                          return;
                        }
                        if (readyVideos.length > 2) {
                          setCreatorError("Maximum 2 videos allowed. Please remove excess videos.");
                          return;
                        }
                        setCreatorError("");
                        setMediaNotice(null);
                        setCreatorStep(3);
                      }}
                      className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Continue to AI / Content</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 3: AI DESCRIPTION GENERATOR vs MANUAL (SECTIONS 7 & 8) ─ */}
              {creatorStep === 3 && (
                <div className="space-y-6">
                  {/* Two Clear Options required by Section 8 */}
                  <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md mx-auto">
                    <button
                      type="button"
                      onClick={() => setDescMode("AI")}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 ${
                        descMode === "AI"
                          ? "bg-white text-[#113D60] shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Option A: Generate with AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDescMode("MANUAL")}
                      className={`flex-1 py-2 text-xs font-medium rounded-xl transition flex items-center justify-center gap-1.5 ${
                        descMode === "MANUAL"
                          ? "bg-white text-[#113D60] shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Option B: Write Manually</span>
                    </button>
                  </div>

                  {/* ─── OPTION A: AI GENERATOR (SECTION 7) ────────────────────────── */}
                  {descMode === "AI" && (
                    <div className="p-6 bg-gradient-to-br from-cyan-50/70 via-slate-50 to-blue-50/70 rounded-2xl border border-cyan-200/80 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          {/* Exact Title from Section 7 */}
                          <h4 className="text-base font-bold text-[#113D60] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-cyan-600" />
                            <span>Create Listing with AI</span>
                          </h4>
                          {/* Exact Description from Section 7 */}
                          <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                            &ldquo;Noryvanta AI can analyze your uploaded images and help create a short, structured description for your listing.&rdquo;
                          </p>
                        </div>

                        {/* Exact Button from Section 7 */}
                        <button
                          type="button"
                          disabled={aiGenerating}
                          onClick={handleGenerateWithAi}
                          className="px-5 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center gap-2 shrink-0 disabled:opacity-50"
                        >
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          <span>{aiGenerating ? "Analyzing Images..." : "Generate with AI"}</span>
                        </button>
                      </div>

                      {/* Important AI Rule Enforced Notification */}
                      <div className="p-3 bg-white/90 rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Noryvanta AI Compliance Guard:</strong> AI will not invent factual dimensions, certifications, prices, or legal warranty claims. Missing technical specifications are flagged: <em>&ldquo;Please provide this information manually.&rdquo;</em>
                        </span>
                      </div>

                      {/* Generated Editable Content */}
                      <div className="space-y-4 pt-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Suggested Name (AI Generated, Editable)
                          </label>
                          <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Short Description (AI Generated, Editable)
                          </label>
                          <textarea
                            rows={2}
                            value={formData.shortDescription}
                            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                            className="w-full p-3 text-xs border border-slate-200 rounded-xl bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Key Features (Bulleted List)
                          </label>
                          <div className="space-y-2">
                            {formData.keyFeatures.map((feat, i) => (
                              <div key={i} className="flex gap-2">
                                <span className="text-cyan-600 font-bold">•</span>
                                <input
                                  type="text"
                                  value={feat}
                                  onChange={(e) => {
                                    const next = [...formData.keyFeatures];
                                    next[i] = e.target.value;
                                    setFormData({ ...formData, keyFeatures: next });
                                  }}
                                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Keywords Tagging */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Search Keywords (AI Suggested)
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {formData.keywords.map((kw, i) => (
                              <span key={i} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
                                #{kw}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons required by Section 7: Accept AI Content, Edit, Regenerate */}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAiAccepted(true);
                              setCreatorStep(4);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Accept AI Content</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDescMode("MANUAL")}
                            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit Manually</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleGenerateWithAi}
                            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Regenerate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── OPTION B: WRITE MANUALLY (SECTION 8) ────────────────────── */}
                  {descMode === "MANUAL" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Product/Service Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Price (₹ INR) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Unit / Pricing Metric <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                            placeholder="e.g. Unit, Meter, Kg, Project"
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Availability</label>
                          <select
                            value={formData.availability}
                            onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                          >
                            <option value="In Stock">In Stock</option>
                            <option value="Available on Order">Available on Order</option>
                            <option value="Active">Active</option>
                            <option value="Temporarily Unavailable">Temporarily Unavailable</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Short Description
                        </label>
                        <textarea
                          rows={2}
                          value={formData.shortDescription}
                          onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                          className="w-full p-3 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Detailed Description
                        </label>
                        <textarea
                          rows={4}
                          value={formData.detailedDescription}
                          onChange={(e) => setFormData({ ...formData, detailedDescription: e.target.value })}
                          className="w-full p-3 text-xs border border-slate-200 rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(2)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreatorStep(4)}
                      className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>Proceed to Customer Preview</span>
                      <ArrowRight className="w-4 h-4 text-cyan-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* ─── STEP 4: PREVIEW & PUBLISH (SECTION 9) ──────────────────── */}
              {creatorStep === 4 && (
                <div className="space-y-6">
                  {/* Exact Section 9 Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-[#113D60]">Listing Preview</h3>
                      <p className="text-xs text-slate-500">
                        This preview looks exactly like the customer-facing listing on Noryvanta.in.
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-lg">
                      Status: Draft → Published
                    </span>
                  </div>

                  {/* Customer-facing Listing Preview Component */}
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Image gallery */}
                      <div className="space-y-2">
                        <div className="h-64 rounded-xl overflow-hidden bg-slate-200">
                          <img
                            src={uploadedImages[primaryImageIdx] || uploadedImages[0]}
                            alt={formData.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {uploadedImages.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt=""
                              onClick={() => setPrimaryImageIdx(i)}
                              className={`w-14 h-14 rounded-lg object-cover cursor-pointer border-2 transition ${
                                primaryImageIdx === i ? "border-cyan-500" : "border-slate-200"
                              }`}
                            />
                          ))}
                          {readyVideos.map((vid) => (
                            <div
                              key={vid.id}
                              className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-200 relative flex items-center justify-center shrink-0"
                              title="Product Video Clip"
                            >
                              <video src={vid.url} className="w-full h-full object-cover opacity-75" />
                              <Play className="w-4 h-4 text-white absolute" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs text-cyan-700 font-medium uppercase">
                          <span>{formData.category}</span>
                          <span>•</span>
                          <span>{listingType}</span>
                        </div>

                        <h2 className="text-xl font-bold text-[#113D60] leading-snug tracking-tight">
                          {formData.title}
                        </h2>

                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-medium">{currentBusiness.name}</span>
                          {currentBusiness.isVerified && (
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              Verified
                            </span>
                          )}
                        </div>

                        <p className="text-2xl font-semibold text-[#113D60] pt-1">
                          {formatPrice(formData.price)}
                          <span className="text-xs font-normal text-slate-500 ml-1">/ {formData.unit}</span>
                        </p>

                        <p className="text-xs text-slate-600 leading-relaxed">
                          {formData.shortDescription}
                        </p>

                        <div className="pt-2">
                          <h4 className="text-xs font-bold text-slate-700 mb-1.5">Key Highlights:</h4>
                          <ul className="text-xs text-slate-600 space-y-1">
                            {formData.keyFeatures.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* ─── 3. BUSINESS LISTING TERMS & PLATFORM FEE (Section 3) ─── */}
                    <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                        <Percent className="w-4 h-4 text-amber-700" />
                        <span>NORYVANTA PLATFORM FEE ({feeRatePercent.toFixed(2)}%)</span>
                      </div>
                      <p className="text-amber-800 text-[11px] leading-relaxed">
                        Noryvanta charges a category-based platform fee ({feeRatePercent.toFixed(2)}% for registered {currentBusiness.businessType}) to the business on each successful transaction conducted through the Noryvanta platform, subject to applicable taxes, refunds, cancellations, payment processing arrangements and the Noryvanta Terms &amp; Conditions.
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className="text-[11px] font-bold text-cyan-800 hover:text-cyan-900 underline block"
                      >
                        View Full Terms &amp; Conditions
                      </button>
                      <label className="flex items-start gap-2 pt-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={feeTermsAgreed}
                          onChange={(e) => setFeeTermsAgreed(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-[#113D60] focus:ring-[#113D60]"
                        />
                        <span className="text-slate-800 font-semibold text-[11px]">
                          I have read and agree to the Noryvanta Platform Fee Terms and Conditions.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Exact Buttons required by Section 9: Save Draft, Edit, Submit / Publish */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCreatorStep(3)}
                      className="px-5 py-2.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Edit
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handlePublishListing("Draft")}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                      >
                        Save Draft
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishListing("Pending Review")}
                        className="px-5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl transition"
                      >
                        Submit for Review
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishListing("Published")}
                        className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Submit / Publish</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB: EARNINGS & TRANSACTIONS (SECTIONS 11 & 12) ─────────────────── */}
        {(activeTab === "earnings" || activeTab === "transactions") && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-cyan-500/10 text-emerald-600 border border-emerald-500/20 shadow-2xs flex items-center justify-center shrink-0">
                <ReceiptText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-headline text-[#113D60]">
                  Earning Ledger
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Full transparency into gross sales, Noryvanta category-based platform fees, statutory deductions, and net settlement payouts.
                </p>
              </div>
            </div>

            {/* Metric KPI Cards with Minimal Thin Slick Borders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Gross Sales</span>
                <p className="text-lg font-semibold text-[#113D60] mt-1">{formatPrice(grossSales)}</p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Successful Txns</span>
                <p className="text-lg font-semibold text-emerald-700 mt-1">{successfulTxnCount}</p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Platform Fees</span>
                <p className="text-lg font-semibold text-amber-700 mt-1">{formatPrice(platformFees)}</p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Refunds / Adj.</span>
                <p className="text-lg font-semibold text-slate-500 mt-1">{formatPrice(refundsAdjustments)}</p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Net Settlement</span>
                <p className="text-lg font-semibold text-emerald-700 mt-1">{formatPrice(netAmount)}</p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 hover:border-cyan-500/40 shadow-ambient transition-all duration-200">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Pending Settlement</span>
                <p className="text-lg font-semibold text-slate-700 mt-1">{formatPrice(pendingPayments)}</p>
              </div>
            </div>

            {/* Transaction Records Card with Minimal Thin Slick Borders */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-ambient overflow-hidden p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#113D60]">Transaction Records</h3>
                  <p className="text-[11px] text-slate-400">Audited settlement ledger and deductions breakdown</p>
                </div>
                <span className="text-xs font-semibold text-slate-500 px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200/60">
                  {businessTransactions.length} records
                </span>
              </div>

              {/* Mobile Card List View (< sm screens) */}
              <div className="sm:hidden space-y-3">
                {businessTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="p-3.5 bg-slate-50/70 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-[#113D60]">{txn.orderId}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          txn.status === "Successful"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : txn.status === "Pending"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-red-50 text-red-800 border border-red-200"
                        }`}
                      >
                        {txn.status}
                      </span>
                    </div>

                    <div className="text-xs">
                      <p className="font-semibold text-slate-800 truncate">{txn.itemTitle}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{txn.customerName} • {txn.date}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Gross</span>
                        <span className="font-bold text-slate-800">{formatPrice(txn.grossAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 block font-medium">Fee</span>
                        <span className="font-bold text-amber-700">-{formatPrice(txn.platformFeeAmount)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 block font-medium">Net</span>
                        <span className="font-bold text-emerald-700">{formatPrice(txn.netSettlement)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedTransactionDetail(txn)}
                      className="w-full mt-2 py-2 bg-[#113D60] hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs"
                    >
                      View Breakdown
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop / Tablet Table View (sm: screens and up) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-slate-500 font-semibold bg-slate-50/80">
                      <th className="p-3">Date</th>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product/Service</th>
                      <th className="p-3">Gross Amount</th>
                      <th className="p-3">Platform Fee</th>
                      <th className="p-3">Other Charges</th>
                      <th className="p-3">Net Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Settlement Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {businessTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50/80 transition-all">
                        <td className="p-3 text-slate-500 font-mono">{txn.date}</td>
                        <td className="p-3 font-mono font-bold text-[#113D60]">{txn.orderId}</td>
                        <td className="p-3 font-medium text-slate-700">{txn.customerName}</td>
                        <td className="p-3 text-slate-600 truncate max-w-xs">{txn.itemTitle}</td>
                        <td className="p-3 font-bold text-slate-900">{formatPrice(txn.grossAmount)}</td>
                        <td className="p-3 font-semibold text-amber-700">-{formatPrice(txn.platformFeeAmount)}</td>
                        <td className="p-3 text-slate-400">{formatPrice(0)}</td>
                        <td className="p-3 font-bold text-emerald-700">{formatPrice(txn.netSettlement)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              txn.status === "Successful"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                : txn.status === "Pending"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTransactionDetail(txn)}
                            className="px-3 py-1.5 bg-[#113D60] hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs whitespace-nowrap cursor-pointer"
                          >
                            View Breakdown
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: BUSINESS PROFILE EDITOR (SECTION 13) ──────────────────────── */}
        {activeTab === "profile" && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold font-headline text-[#113D60]">Business Profile</h2>
                <p className="text-xs text-slate-500">Edit public marketplace information for your entity.</p>
              </div>
              <Link
                href={`/businesses/${currentBusiness.id}`}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 rounded-xl transition flex items-center gap-1.5"
              >
                <span>View Public Profile</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Shop Name</label>
                  <input
                    type="text"
                    value={currentBusiness.name}
                    onChange={(e) => updateBusiness(currentBusiness.id, { name: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={currentBusiness.ownerName}
                    onChange={(e) => updateBusiness(currentBusiness.id, { ownerName: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Business Description</label>
                <textarea
                  rows={4}
                  value={currentBusiness.description}
                  onChange={(e) => updateBusiness(currentBusiness.id, { description: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={currentBusiness.city}
                    onChange={(e) => updateBusiness(currentBusiness.id, { city: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    value={currentBusiness.state}
                    onChange={(e) => updateBusiness(currentBusiness.id, { state: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
                  <input
                    type="text"
                    value={currentBusiness.pinCode}
                    onChange={(e) => updateBusiness(currentBusiness.id, { pinCode: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={currentBusiness.gstNumber || ""}
                  onChange={(e) => updateBusiness(currentBusiness.id, { gstNumber: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => alert("Profile updated successfully!")}
                  className="px-6 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white font-bold rounded-xl transition"
                >
                  Save Profile Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: SETTINGS → PAYMENT & SETTLEMENT (SECTION 18) ─────────────── */}
        {activeTab === "settings" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700">
                <Settings className="w-4 h-4" />
                <span>Business Settings</span>
              </div>
              <h2 className="text-xl font-bold font-headline text-[#113D60] mt-1">
                Payment & Settlement Preferences
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enable or disable customer payment methods, configure Cash on Delivery rules, and manage verified bank account settlements.
              </p>
            </div>

            {/* Payment Methods Toggle Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#113D60]">Accepted Customer Payment Methods</h3>
                  <p className="text-xs text-slate-500">
                    Control which payment rails customers can use when purchasing from your business.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Real-time Active
                </span>
              </div>

              {/* Exact Checkboxes from Section 18:
                  ☑ UPI
                  ☑ Credit/Debit Card
                  ☑ Net Banking
                  ☑ Wallets
                  ☑ EMI / Pay Later
                  ☑ Cash on Delivery */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.upi}
                      onChange={() => toggleBusinessPaymentMethod("upi")}
                      className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60] w-4 h-4"
                    />
                    <span>UPI (Google Pay, PhonePe, Paytm, QR)</span>
                  </div>
                  <span className="text-[10px] text-cyan-700 font-bold">Instant</span>
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.card}
                      onChange={() => toggleBusinessPaymentMethod("card")}
                      className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60] w-4 h-4"
                    />
                    <span>Credit / Debit Card (Visa, Master, RuPay)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">T+2</span>
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.netbanking}
                      onChange={() => toggleBusinessPaymentMethod("netbanking")}
                      className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60] w-4 h-4"
                    />
                    <span>Net Banking (50+ Indian Banks)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">T+1</span>
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.wallets}
                      onChange={() => toggleBusinessPaymentMethod("wallets")}
                      className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60] w-4 h-4"
                    />
                    <span>Wallets (Amazon Pay, Paytm, MobiKwik)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">Instant</span>
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.emi}
                      onChange={() => toggleBusinessPaymentMethod("emi")}
                      className="rounded border-slate-300 text-[#113D60] focus:ring-[#113D60] w-4 h-4"
                    />
                    <span>EMI / Pay Later (Simpl, ZestMoney)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">T+2</span>
                </label>

                {/* Section 9 & 18: Cash on Delivery Setting */}
                <label className="flex items-center justify-between p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 cursor-pointer transition">
                  <div className="flex items-center gap-2.5 font-bold text-amber-950">
                    <input
                      type="checkbox"
                      checked={businessPaymentSettings.enabledMethods.cod}
                      onChange={() => toggleBusinessPaymentMethod("cod")}
                      className="rounded border-amber-300 text-amber-700 focus:ring-amber-700 w-4 h-4"
                    />
                    <span>Cash on Delivery (COD) [ ON / OFF ]</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800">
                    {businessPaymentSettings.codEnabled ? "Enabled" : "Disabled"}
                  </span>
                </label>
              </div>

              <p className="text-[11px] text-slate-400">
                Note: Cash on Delivery is strictly available for physical goods and eligible delivery PIN codes.
              </p>
            </div>

            {/* Settlement Information (Section 18) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#113D60]">Settlement Information &amp; Bank Account</h3>
                  <p className="text-xs text-slate-500">
                    Direct automated NEFT/RTGS disbursals after category platform fee deduction.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Settlement Status: Active</span>
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Beneficiary Name:</span>
                  <span className="font-bold text-[#113D60] mt-0.5 block">
                    {businessPaymentSettings.settlementAccount.beneficiaryName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Bank Name & Branch:</span>
                  <span className="font-semibold text-slate-700 mt-0.5 block">
                    {businessPaymentSettings.settlementAccount.bankName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Account Number:</span>
                  <span className="font-mono font-bold text-slate-800 mt-0.5 block">
                    {businessPaymentSettings.settlementAccount.accountNumberMasked}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">IFSC Code:</span>
                  <span className="font-mono font-bold text-cyan-800 mt-0.5 block">
                    {businessPaymentSettings.settlementAccount.ifscCode}
                  </span>
                </div>
              </div>

              {/* Settlement History Summary */}
              <div className="pt-2 space-y-3">
                <h4 className="text-xs font-bold text-slate-800">Settlement Ledger Summary</h4>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block">Successful Txns</span>
                    <span className="font-bold text-emerald-700 text-base">{successfulTxnCount}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Refunds</span>
                    <span className="font-semibold text-slate-600 text-base">₹0</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-400 text-[10px] block font-medium">Total Net Settled</span>
                    <span className="font-semibold text-emerald-700 text-base">{formatPrice(netAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: OTHER SIDEBAR VIEWS ────────────────────────────────────────── */}
        {["orders", "customers", "reviews", "promotions", "analytics", "help-support"].includes(activeTab) && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-600">
              <Sliders className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-[#113D60] capitalize">
              {activeTab.replace("-", " ")} Module Active
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Real-time synchronization connected. All customer requests and orders are processed through Noryvanta&apos;s escrow infrastructure.
            </p>
            <button
              onClick={() => setActiveTab("dashboard")}
              className="px-5 py-2 bg-[#113D60] text-white text-xs font-medium rounded-xl"
            >
              Return to Overview
            </button>
          </div>
        )}

        {/* ─── 6. BUSINESS TRANSACTION DETAIL MODAL (Section 6) ────────────────── */}
        {selectedTransactionDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                    Business Financial Settlement
                  </span>
                  <h3 className="text-xl font-bold text-[#113D60] tracking-tight">
                    ORDER #{selectedTransactionDetail.orderId}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{selectedTransactionDetail.itemTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTransactionDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Private Business Financial Notice */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Private Business Financial Information — Never shown to customer</span>
              </div>

              {/* Financial Breakdown (matching Section 6 exactly) */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">Customer Order Value:</span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {formatPrice(selectedTransactionDetail.grossAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-amber-800">
                  <span className="font-medium">Noryvanta Platform Fee ({((selectedTransactionDetail.platformFeeRate || (feeRatePercent / 100)) * 100).toFixed(2)}%):</span>
                  <span className="font-semibold text-amber-700">
                    -{formatPrice(selectedTransactionDetail.platformFeeAmount || Math.round(selectedTransactionDetail.grossAmount * (feeRatePercent / 100)))}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-500">
                  <span>Other Applicable Charges:</span>
                  <span className="font-medium">{formatPrice(0)}</span>
                </div>

                <div className="flex justify-between items-center text-slate-500">
                  <span>Refunds / Adjustments:</span>
                  <span className="font-medium">{formatPrice(0)}</span>
                </div>

                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                  <span className="font-semibold text-slate-800 text-sm">Net Business Settlement:</span>
                  <span className="font-semibold text-emerald-700 text-lg">
                    {formatPrice(selectedTransactionDetail.netSettlement || selectedTransactionDetail.grossAmount * 0.90)}
                  </span>
                </div>
              </div>

              {/* Status Pills */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">Payment Status</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{selectedTransactionDetail.status}</span>
                  </span>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">Settlement Status</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    Settled to Bank (••••4920)
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTransactionDetail(null)}
                  className="px-5 py-2.5 bg-[#113D60] text-white text-xs font-bold rounded-xl hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs cursor-pointer"
                >
                  Close Detail
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TERMS & CONDITIONS MODAL (Section 3) ─────────────────────────── */}
        {showTermsModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-[#113D60]">Noryvanta Platform Fee Terms</h3>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-slate-600 space-y-3 max-h-72 overflow-y-auto leading-relaxed">
                <p className="font-bold text-slate-800">1. Category-Based Platform Fee Structure</p>
                <p>
                  Noryvanta charges a category-based platform fee (Wholesaler: 3.20%, Distributor: 5.20%, Services: 5.20%, Retailer: 8.20%) to the registered business on each successful transaction conducted through the Noryvanta platform, subject to applicable taxes, refunds, cancellations, payment processing arrangements and the Noryvanta Terms &amp; Conditions.
                </p>
                <p className="font-bold text-slate-800">2. Customer Checkout Exemption</p>
                <p>
                  Noryvanta&apos;s platform fee is strictly a business-side charge. It is never added as a surcharge on customer checkout bills. Customers pay solely the listed price plus applicable customer-side shipping.
                </p>
                <p className="font-bold text-slate-800">3. Sovereign Escrow &amp; Bank Settlement</p>
                <p>
                  Funds are held securely in RBI-compliant institutional nodal escrow until consignee delivery is verified. Net business settlement (gross less applicable category platform fee) is automatically remitted to the business&apos;s verified bank account.
                </p>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setFeeTermsAgreed(true);
                    setShowTermsModal(false);
                  }}
                  className="px-5 py-2.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-cyan-500/40 hover:border-cyan-400 transition-all shadow-2xs cursor-pointer"
                >
                  Acknowledge &amp; Accept
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BusinessDashboardPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Business Dashboard...</div>}>
      <DashboardMainContent />
    </Suspense>
  );
}
