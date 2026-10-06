"use client";

import React, { useState, useMemo } from "react";
import {
  NETWORK_RANKS,
  generateInitialLevels,
  RECENT_NETWORK_ACTIVITIES,
  CYCLES_DATA,
  LevelStatus,
  NetworkLevelRecord,
  RankDefinition,
  getRankRewardBenchmark
} from "@/lib/networkProgressData";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  Clock,
  AlertTriangle,
  Star,
  Award,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  History,
  Filter,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Eye,
  AlertCircle,
  Copy,
  Share2,
  QrCode,
  Scan,
  Wallet,
  Building2,
  ExternalLink
} from "lucide-react";

export const NetworkProgressTracker: React.FC = () => {
  const [levels, setLevels] = useState<NetworkLevelRecord[]>(() => generateInitialLevels());
  const [selectedLevel, setSelectedLevel] = useState<NetworkLevelRecord | null>(null);
  const [filterView, setFilterView] = useState<string>("ALL");
  const [selectedBusinessType, setSelectedBusinessType] = useState<"Wholesaler" | "Distributor" | "Services" | "Retailer">("Wholesaler");
  const [expandedRanks, setExpandedRanks] = useState<Record<string, boolean>>({
    Gold: true,
    Bronze: false,
    Silver: false,
    Panna: false,
    Platinum: false,
    Ruby: false,
    Sapphire: false,
    Emerald: false,
    Diamond: false,
    "Black Diamond": false,
    Mythic: false,
    Legendary: false
  });

  // Modals state
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [rankCompletionModal, setRankCompletionModal] = useState<{
    rankName: string;
    level: number;
    rate: number;
    amount: number;
    reward: number;
    status: string;
  } | null>(null);

  // Referral UI state
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanResult, setScanResult] = useState<{ valid: boolean; message: string } | null>(null);

  // Current User Sample Data (Section 18 & 69: Consumer: A, UAID: NRY-XXXX, Cycle 1, Level 37, Gold, KYC Verified)
  const currentMember = {
    name: "Consumer: A",
    uaid: "NRY-HS-APEX-891402",
    currentCycle: "Cycle 1",
    currentLevel: 37,
    currentRank: "Gold",
    kycStatus: "Verified",
    businessType: selectedBusinessType,
    targetRankMaxLevel: 40,
    targetRankMinLevel: 31
  };

  const currentLevelRecord = levels.find((l) => l.levelNumber === currentMember.currentLevel);

  // Minimum unit based on business type (Section 5)
  const minUnit = selectedBusinessType === "Wholesaler" ? 100000 : selectedBusinessType === "Distributor" ? 10000 : 5000;

  // Precomputed Rank Benchmarks for all 12 Ranks based on selected business type
  const rankBenchmarks = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => getRankRewardBenchmark(selectedBusinessType, i + 1));
  }, [selectedBusinessType]);

  // Dynamic Summary calculations (Section 13)
  const summaryMetrics = useMemo(() => {
    const completed = levels.filter(
      (l) => l.status === "CYCLE_COMPLETED" || l.status === "REWARD_APPROVED" || l.status === "QUALIFIED"
    ).length;
    const inProgress = levels.filter((l) => l.status === "IN_PROGRESS" || l.status === "REWARD_PENDING").length;
    const qualified = levels.filter(
      (l) => l.status === "QUALIFIED" || l.status === "REWARD_PENDING" || l.status === "REWARD_APPROVED" || l.status === "CYCLE_COMPLETED"
    ).length;
    const pendingVerification = levels.filter((l) => l.status === "UNDER_VERIFICATION" || l.status === "TRANSACTION_RECEIVED").length;
    const rewardPending = levels.filter((l) => l.status === "REWARD_PENDING").length;
    const rewardApproved = levels.filter((l) => l.status === "REWARD_APPROVED").length;
    const reversed = levels.filter((l) => l.status === "REVERSED").length;

    return {
      completed,
      inProgress,
      qualified,
      pendingVerification,
      rewardPending,
      rewardApproved,
      reversed
    };
  }, [levels]);

  // Reward Ledger data for Section 25 (Bronze, Silver, Panna completed, Gold pending)
  const rewardLedgerRecords = useMemo(() => {
    const bronze = rankBenchmarks[0];
    const silver = rankBenchmarks[1];
    const panna = rankBenchmarks[2];
    return [
      {
        id: "LEDGER-L36",
        date: "30 Sep 2026",
        cycle: "Cycle 1",
        eventType: "LEVEL_COMPLETED",
        rankName: "Gold",
        qualificationLevel: 36,
        businessType: selectedBusinessType,
        qualificationAmount: minUnit * 36,
        rewardRate: 0,
        rewardAmount: 0,
        status: "VERIFIED",
        txRef: "TX-QUAL-L36"
      },
      {
        id: "LEDGER-R3",
        date: "19 Sep 2026",
        cycle: "Cycle 1",
        eventType: "REWARD_ISSUED",
        rankName: "Panna",
        qualificationLevel: 30,
        businessType: selectedBusinessType,
        qualificationAmount: panna.qualificationAmount,
        rewardRate: panna.rewardRate,
        rewardAmount: panna.rewardAmount,
        status: "REWARDED",
        txRef: "TX-QUAL-R3-L30"
      },
      {
        id: "LEDGER-RANK-R3",
        date: "19 Sep 2026",
        cycle: "Cycle 1",
        eventType: "RANK_COMPLETED",
        rankName: "Panna",
        qualificationLevel: 30,
        businessType: selectedBusinessType,
        qualificationAmount: panna.qualificationAmount,
        rewardRate: 0,
        rewardAmount: 0,
        status: "VERIFIED",
        txRef: "TX-RANK-Panna"
      },
      {
        id: "LEDGER-R2",
        date: "28 Aug 2026",
        cycle: "Cycle 1",
        eventType: "REWARD_ISSUED",
        rankName: "Silver",
        qualificationLevel: 20,
        businessType: selectedBusinessType,
        qualificationAmount: silver.qualificationAmount,
        rewardRate: silver.rewardRate,
        rewardAmount: silver.rewardAmount,
        status: "REWARDED",
        txRef: "TX-QUAL-R2-L20"
      },
      {
        id: "LEDGER-RANK-R2",
        date: "28 Aug 2026",
        cycle: "Cycle 1",
        eventType: "RANK_COMPLETED",
        rankName: "Silver",
        qualificationLevel: 20,
        businessType: selectedBusinessType,
        qualificationAmount: silver.qualificationAmount,
        rewardRate: 0,
        rewardAmount: 0,
        status: "VERIFIED",
        txRef: "TX-RANK-Silver"
      },
      {
        id: "LEDGER-R1",
        date: "12 Aug 2026",
        cycle: "Cycle 1",
        eventType: "REWARD_ISSUED",
        rankName: "Bronze",
        qualificationLevel: 10,
        businessType: selectedBusinessType,
        qualificationAmount: bronze.qualificationAmount,
        rewardRate: bronze.rewardRate,
        rewardAmount: bronze.rewardAmount,
        status: "REWARDED",
        txRef: "TX-QUAL-R1-L10"
      },
      {
        id: "LEDGER-RANK-R1",
        date: "12 Aug 2026",
        cycle: "Cycle 1",
        eventType: "RANK_COMPLETED",
        rankName: "Bronze",
        qualificationLevel: 10,
        businessType: selectedBusinessType,
        qualificationAmount: bronze.qualificationAmount,
        rewardRate: 0,
        rewardAmount: 0,
        status: "VERIFIED",
        txRef: "TX-RANK-Bronze"
      }
    ];
  }, [rankBenchmarks, selectedBusinessType, minUnit]);

  // Wallet summary (Section 32)
  const walletSummary = useMemo(() => {
    const totalEarned = rewardLedgerRecords
      .filter((r) => r.eventType === "REWARD_ISSUED")
      .reduce((acc, r) => acc + r.rewardAmount, 0);
    const goldPotential = rankBenchmarks[3].rewardAmount;
    return {
      totalEarned,
      available: totalEarned,
      pending: goldPotential,
      redeemed: 0,
      reversed: 0
    };
  }, [rewardLedgerRecords, rankBenchmarks]);

  // Copy referral code handler with robust fallback
  const handleCopyReferral = () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(currentMember.uaid).catch(() => {
          const textArea = document.createElement("textarea");
          textArea.value = currentMember.uaid;
          textArea.style.position = "fixed";
          textArea.style.opacity = "0";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          document.body.removeChild(textArea);
        });
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentMember.uaid;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {
      // fallback safe
    }
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Share referral handler
  const handleShareReferral = async () => {
    const text = `Join Noryvanta using my referral ID: ${currentMember.uaid} and unlock commercial marketplace growth! https://noryvanta.in/register?ref=${currentMember.uaid}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Noryvanta Referral",
          text,
          url: `https://noryvanta.in/register?ref=${currentMember.uaid}`
        });
      } catch {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  // Scan / Validate referral handler
  const handleVerifyScannedCode = () => {
    const clean = scanInput.trim().toUpperCase();
    if (clean === "NRY-XXXX" || clean.startsWith("NRY-")) {
      setScanResult({
        valid: true,
        message: `✓ Valid Noryvanta referral code (${clean}). Network affiliation verified.`
      });
    } else {
      setScanResult({
        valid: false,
        message: "✕ Invalid referral code. Must follow NRY- prefix format."
      });
    }
  };

  const toggleRank = (rankName: string) => {
    setExpandedRanks((prev) => ({
      ...prev,
      [rankName]: !prev[rankName]
    }));
  };

  const renderStatusIndicator = (status: LevelStatus, levelNumber: number, isCurrent: boolean) => {
    switch (status) {
      case "LOCKED":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-400">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>{levelNumber}</span>
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`flex items-center gap-1 font-mono text-xs font-bold ${isCurrent ? "text-amber-950 font-bold" : "text-blue-700"}`}>
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>{levelNumber}</span>
          </span>
        );
      case "TRANSACTION_RECEIVED":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-amber-700">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-600 bg-amber-200" />
            <span>{levelNumber}</span>
          </span>
        );
      case "UNDER_VERIFICATION":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-amber-800">
            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
            <span>{levelNumber}</span>
          </span>
        );
      case "QUALIFIED":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-800">
            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
            <span>{levelNumber}</span>
          </span>
        );
      case "REWARD_PENDING":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-amber-900">
            <Check className="w-3 h-3 text-emerald-600" />
            <Clock className="w-2.5 h-2.5 text-amber-600" />
            <span>{levelNumber}</span>
          </span>
        );
      case "REWARD_APPROVED":
      case "CYCLE_COMPLETED":
        return (
          <span className="flex items-center gap-1 font-mono text-xs font-bold text-emerald-900">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{levelNumber}</span>
          </span>
        );
      default:
        return <span className="font-mono text-xs text-slate-400">{levelNumber}</span>;
    }
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* ─── SECTION 17: MY NRY REFERRAL ID CARD ──────────────────────────── */}
      <div className="bg-gradient-to-r from-cyan-900 via-[#113D60] to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl border border-cyan-500/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Network Referral Program
              </span>
              <span className="text-xs text-slate-400">• ₹0 Registration Fee</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-headline tracking-tight text-white">
              MY NRY REFERRAL ID
            </h2>
            <p className="text-xs text-slate-300 max-w-xl">
              Share your verified referral ID with trading partners to unlock qualified referral volume.
              Self-purchases are strictly excluded from reward calculation.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full md:w-auto md:min-w-[380px] lg:min-w-[420px]">
            {/* Full Length NRY ID with functional copy icon */}
            <div 
              onClick={handleCopyReferral}
              className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 hover:border-cyan-400/60 rounded-2xl flex items-center justify-between gap-3 shadow-inner cursor-pointer transition group"
              title="Click to copy NRY Referral ID"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">
                  NRY ID:
                </span>
                <span className="font-mono text-base font-semibold tracking-wider text-cyan-300 group-hover:text-cyan-200 transition truncate">
                  {currentMember.uaid}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyReferral();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-400/40 text-xs font-bold transition shrink-0 shadow-xs"
                title="Copy NRY Referral ID"
              >
                {copyFeedback ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Below them: Share NRY ID, Scan NRY ID, Generate QR */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleShareReferral}
                className="py-2.5 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="truncate">Share NRY ID</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScanModalOpen(true);
                  setScanResult(null);
                  setScanInput("");
                }}
                className="py-2.5 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Verify Referral ID"
              >
                <Scan className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="truncate">Scan NRY ID</span>
              </button>

              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="py-2.5 px-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition flex items-center justify-center gap-1.5 shadow-sm"
                title="Generate Referral QR"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">Generate QR</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 18: NETWORK PROGRESS HEADER CARD ─────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-lifted overflow-hidden">
        <div className="bg-gradient-to-r from-[#113D60] via-[#101f3b] to-[#113D60] p-6 sm:p-8 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/80 pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                  Network Progression Ledger
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-white mt-1">
                NORYVANTA NETWORK PROGRESS
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                Connect. Supply. Empower. • 12 Ranks • 120 Progression Levels • Server-side Verified
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setCycleModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <History className="w-3.5 h-3.5 text-cyan-400" />
                <span>Cycle History</span>
              </button>
              <button
                type="button"
                onClick={() => setRulesModalOpen(true)}
                className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5 transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Qualification Rules</span>
              </button>
            </div>
          </div>

          {/* Section 18 Fields: Consumer, UAID, Business Type, Cycle, Current Level, Current Rank, KYC */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Consumer</span>
              <p className="font-semibold text-white text-base mt-0.5">{currentMember.name.replace("Consumer: ", "")}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">UAID</span>
              <p className="font-mono font-semibold text-cyan-300 text-base mt-0.5">{currentMember.uaid}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Business Type</span>
              <p className="font-semibold text-amber-300 text-base mt-0.5">{selectedBusinessType}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Current Cycle</span>
              <p className="font-semibold text-white text-base mt-0.5">{currentMember.currentCycle}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Current Level</span>
              <p className="font-semibold text-amber-400 text-base mt-0.5">Level {currentMember.currentLevel}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Current Rank</span>
              <p className="font-semibold text-yellow-400 text-base mt-0.5 tracking-wide">{currentMember.currentRank.toUpperCase()}</p>
            </div>

            {/* KYC Status in Green */}
            <div className="p-3 bg-emerald-950/60 rounded-2xl border border-emerald-500/40">
              <span className="text-[10px] uppercase font-semibold text-emerald-300 block tracking-wider">KYC Status</span>
              <p className="font-semibold text-emerald-400 text-base mt-0.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>✓ VERIFIED</span>
              </p>
            </div>
          </div>

          {/* Section 33.24: Authoritative Level Qualification Rules & Next Level Requirement */}
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-800/90 via-slate-900/90 to-[#113D60] rounded-2xl border border-amber-500/30 text-xs text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-amber-400 text-slate-950">
                    Section 33 Level Qualification
                  </span>
                  <span className="text-slate-300 font-semibold">Business Type: {selectedBusinessType}</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Eligible referral volume required to complete one level: <strong className="text-amber-300 font-semibold">₹{minUnit.toLocaleString("en-IN")}</strong>
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Eligible Network Volume</span>
                  <p className="font-semibold text-cyan-300 text-sm mt-0.5">
                    ₹{(minUnit * currentMember.currentLevel).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-right border-l border-slate-700 pl-6">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Next Level Requirement</span>
                  <p className="font-semibold text-emerald-400 text-sm mt-0.5">
                    ₹{minUnit.toLocaleString("en-IN")} more
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rule 2 & 7: Quarterly Account Activity & Compliance Bar */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ACCOUNT STATUS: ACTIVE</span>
              </div>
              <span className="text-slate-300">
                Quarterly Requirement: <strong className="text-white font-semibold">Min 1 Purchase / Quarter</strong> (4 Purchases/Year)
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">2026 Quarters:</span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                <Check className="w-3 h-3" /> Q1: MET
              </span>
              <span className="px-2.5 py-1 rounded-md bg-emerald-950 border border-emerald-500/40 text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                <Check className="w-3 h-3" /> Q2: MET
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Q3: PENDING
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-[11px]">
                Q4: PENDING
              </span>
            </div>
          </div>
        </div>

        {/* Current Active Progress Band */}
        <div className="p-6 sm:p-8 bg-amber-50/40 border-t border-amber-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-800" />
                <span>ACTIVE RANK: GOLD (LEVELS 31–40)</span>
              </span>
              <span className="text-xs font-semibold text-slate-600">
                Progress: Level {currentMember.currentLevel} / {currentMember.targetRankMaxLevel}
              </span>
              <span className="text-xs font-medium text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full">
                3 levels remaining to complete Gold Rank
              </span>
            </div>

            <div className="space-y-1.5 max-w-xl">
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-700 shadow-sm"
                  style={{ width: `${(37 / 40) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-medium text-slate-500">
                <span>Current: Level 37</span>
                <span>Gold Completion Target: Level 40</span>
                <span>Rank Progress: 37 / 40</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Important: One rank reward is generated once upon completing Level 40. Levels 31–39 do not generate individual rewards.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (currentLevelRecord) setSelectedLevel(currentLevelRecord);
              }}
              className="px-5 py-3 bg-[#113D60] hover:bg-slate-800 text-white rounded-2xl text-xs font-semibold transition shadow-ambient flex items-center gap-2"
            >
              <span>View Level 37 Audit</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── SECTION 32: MY REWARD BALANCE WALLET CARD ─────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#113D60]">MY REWARD BALANCE</h3>
              <p className="text-xs text-slate-500">
                Immutable wallet ledger • Cumulative verified rank qualification rewards
              </p>
            </div>
          </div>

          <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200">
            Currency: INR (₹)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">Total Earned</span>
            <p className="text-xl font-semibold text-emerald-800 mt-1">₹{walletSummary.totalEarned.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Bronze, Silver &amp; Panna paid</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block">Available</span>
            <p className="text-xl font-semibold text-[#113D60] mt-1">₹{walletSummary.available.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Eligible repurchase balance</p>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 block">Pending</span>
            <p className="text-xl font-semibold text-amber-800 mt-1">₹{walletSummary.pending.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-amber-600 mt-0.5">Gold Rank at Level 40</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Redeemed</span>
            <p className="text-xl font-semibold text-slate-400 mt-1">₹0</p>
            <p className="text-[10px] text-slate-400 mt-0.5">0 redemptions</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">Reversed</span>
            <p className="text-xl font-semibold text-slate-400 mt-1">₹0</p>
            <p className="text-[10px] text-slate-400 mt-0.5">0 active disputes</p>
          </div>
        </div>

        {/* Section 32 & 44 Legal Notice */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
          <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-800 font-semibold">Ecosystem Wallet Rule:</strong> Rewards are not withdrawable as cash under current Noryvanta business rules.
            Reward balances are strictly applicable toward eligible Noryvanta platform purchases and commercial ecosystem repurchases according to the applicable Terms &amp; Conditions.
          </span>
        </div>
      </div>

      {/* ─── SECTION 20 & 21: RANK CARDS & BUSINESS TYPE SWITCHER ────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#113D60] tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>12 RANK REWARD PROGRESSION</span>
            </h2>
            <p className="text-xs text-slate-500">
              One-time rank reward triggers ONLY upon completion of each Rank&apos;s final milestone level.
            </p>
          </div>

          {/* Business Type Selector (Section 33: Wholesaler, Distributor, Services, Retailer) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start sm:self-auto">
            {(["Wholesaler", "Distributor", "Services", "Retailer"] as const).map((bt) => (
              <button
                key={bt}
                type="button"
                onClick={() => setSelectedBusinessType(bt)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedBusinessType === bt
                    ? "bg-[#113D60] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {bt} ({bt === "Wholesaler" ? "₹1,00,000" : bt === "Distributor" ? "₹10,000" : "₹5,000"})
              </button>
            ))}
          </div>
        </div>

        {/* Critical Rule Banner (Section 2, 3, 14) */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <strong className="block font-bold">CRITICAL REWARD RULE: Reward is RANK based, NOT LEVEL based.</strong>
            <span>
              Reaching Levels 1–9, 11–19, 21–29 does not trigger rank rewards. Exactly ONE reward is generated when the completion level is reached (Level 10 for Bronze, Level 20 for Silver, Level 30 for Panna, Level 40 for Gold, etc.). Previous rank rewards are never repeated.
            </span>
          </div>
        </div>

        {/* 12 Rank Cards Grid (Section 20) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rankBenchmarks.map((rb) => {
            const isCompleted = currentMember.currentLevel >= rb.completionLevel;
            const isCurrent = currentMember.currentLevel >= rb.startLevel && currentMember.currentLevel <= rb.endLevel;
            const rankDef = NETWORK_RANKS[rb.rankNumber - 1];

            let statusLabel = "LOCKED";
            let statusBadgeClass = "bg-slate-100 text-slate-500 border-slate-200";

            if (isCompleted) {
              statusLabel = "REWARDED";
              statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
            } else if (isCurrent) {
              statusLabel = "IN PROGRESS";
              statusBadgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
            }

            return (
              <div
                key={rb.rankName}
                className={`bg-white rounded-3xl p-5 border transition-all duration-300 shadow-sm flex flex-col justify-between space-y-4 ${
                  isCurrent
                    ? "border-amber-400 ring-2 ring-amber-400/20 shadow-md"
                    : isCompleted
                    ? "border-emerald-200 bg-emerald-50/20"
                    : "border-slate-200 opacity-80 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-gradient-to-br ${rankDef.accentClass} text-white`}>
                        {rb.rankNumber}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-[#113D60] tracking-tight">{rb.rankName.toUpperCase()}</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Levels {rb.startLevel}–{rb.endLevel}</span>
                      </div>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-semibold border ${statusBadgeClass}`}>
                      {statusLabel}
                    </span>
                  </div>

                  {/* 10 Progress Dots (Section 20) */}
                  <div className="grid grid-cols-10 gap-1 my-3 py-1 border-y border-slate-100">
                    {Array.from({ length: 10 }, (_, idx) => {
                      const lvlNum = rb.startLevel + idx;
                      const isLvlDone = currentMember.currentLevel >= lvlNum;
                      const isLvlCurr = currentMember.currentLevel === lvlNum;
                      return (
                        <div
                          key={lvlNum}
                          title={`Level ${lvlNum}`}
                          className={`h-2 rounded-full transition-all ${
                            isLvlDone
                              ? "bg-emerald-500"
                              : isLvlCurr
                              ? "bg-amber-500 animate-pulse ring-1 ring-amber-400"
                              : "bg-slate-200"
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completion Milestone:</span>
                      <span className="font-semibold text-slate-800">Level {rb.completionLevel}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Multiplier:</span>
                      <span className="font-mono text-slate-700">{rb.multiplier}x (Rank {rb.rankNumber})</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Qualification Volume:</span>
                      <span className="font-semibold text-slate-800">₹{rb.qualificationAmount.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-400">Reward Rate:</span>
                      <span className="font-semibold text-cyan-800">{rb.rewardRate.toFixed(2)}%</span>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-100">
                      <span className="font-semibold text-slate-700">Rank Reward:</span>
                      <span className="font-semibold text-emerald-700 text-sm">
                        ₹{rb.rewardAmount.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 italic">
                    {isCompleted
                      ? "Reward Paid Once"
                      : isCurrent
                      ? "Pending Level 40"
                      : "Locked"}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setRankCompletionModal({
                        rankName: rb.rankName,
                        level: rb.completionLevel,
                        rate: rb.rewardRate,
                        amount: rb.qualificationAmount,
                        reward: rb.rewardAmount,
                        status: isCompleted ? "REWARDED" : isCurrent ? "PENDING" : "LOCKED"
                      });
                    }}
                    className="text-[11px] font-bold text-cyan-800 hover:text-cyan-900 flex items-center gap-1"
                  >
                    <span>Calculation Breakdown</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 25: MY REWARD LEDGER (Table & Mobile Cards) ─────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="text-base font-bold text-[#113D60]">MY REWARD LEDGER</h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">Immutable Historical Audit</span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Cycle</th>
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Trigger Level</th>
                <th className="py-3 px-4">Business Type</th>
                <th className="py-3 px-4">Qualification Volume</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Reward Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Transaction Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {rewardLedgerRecords.map((rec) => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3 px-4 font-mono text-[11px]">{rec.date}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                      rec.eventType === "REWARD_ISSUED"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : rec.eventType === "RANK_COMPLETED"
                        ? "bg-purple-100 text-purple-800 border border-purple-300"
                        : "bg-blue-100 text-blue-800 border border-blue-300"
                    }`}>
                      {rec.eventType}
                    </span>
                  </td>
                  <td className="py-3 px-4">{rec.cycle}</td>
                  <td className="py-3 px-4 font-semibold text-[#113D60]">{rec.rankName}</td>
                  <td className="py-3 px-4 font-mono">Level {rec.qualificationLevel}</td>
                  <td className="py-3 px-4">{rec.businessType}</td>
                  <td className="py-3 px-4 font-mono">₹{rec.qualificationAmount.toLocaleString("en-IN")}</td>
                  <td className="py-3 px-4 font-semibold text-cyan-800">
                    {rec.rewardRate > 0 ? `${rec.rewardRate.toFixed(2)}%` : "—"}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">
                    {rec.rewardAmount > 0 ? `₹${rec.rewardAmount.toLocaleString("en-IN")}` : "Progress only"}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                      ✓ {rec.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{rec.txRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View (Section 25 & 33) */}
        <div className="md:hidden space-y-3">
          {rewardLedgerRecords.map((rec) => (
            <div key={rec.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-[#113D60]">{rec.rankName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">• Level {rec.qualificationLevel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase ${
                    rec.eventType === "REWARD_ISSUED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : rec.eventType === "RANK_COMPLETED"
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-blue-100 text-blue-800 border border-blue-300"
                  }`}>
                    {rec.eventType}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {rec.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Qualification Volume</span>
                  <span className="font-semibold text-slate-800">₹{rec.qualificationAmount.toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Reward Rate</span>
                  <span className="font-semibold text-cyan-800">{rec.rewardRate > 0 ? `${rec.rewardRate.toFixed(2)}%` : "—"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Reward Issuance</span>
                  <span className="font-semibold text-emerald-700 text-xs">
                    {rec.rewardAmount > 0 ? `₹${rec.rewardAmount.toLocaleString("en-IN")}` : "Progress only"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date / Cycle</span>
                  <span className="text-slate-600">{rec.date} ({rec.cycle})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── SECTION 19: 120-LEVEL PROGRESSION GRID ──────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-[#113D60]">120-LEVEL DIGITAL MILESTONE MATRIX</h3>
            <p className="text-xs text-slate-500">
              Interactive milestone nodes • Tap any node to inspect audit timeline and level value
            </p>
          </div>

          {/* Filter view pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "ALL", label: "All (120)" },
              { id: "COMPLETED", label: "Completed (36)" },
              { id: "IN_PROGRESS", label: "In Progress (1)" },
              { id: "LOCKED", label: "Locked (83)" }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterView(f.id)}
                className={`px-3 py-1 rounded-xl text-[11px] font-medium transition ${
                  filterView === f.id
                    ? "bg-[#113D60] text-white shadow-xs font-semibold"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 12 Rank Blocks */}
        <div className="space-y-3">
          {NETWORK_RANKS.map((rank) => {
            const rankLevels = levels.filter((l) => l.levelNumber >= rank.startLevel && l.levelNumber <= rank.endLevel);
            const isExpanded = expandedRanks[rank.name] ?? false;
            const isCurrent = rank.name === "Gold";
            const isFinished = rank.endLevel <= 30;

            return (
              <div
                key={rank.name}
                className={`rounded-2xl border transition ${
                  isCurrent ? "border-amber-400 bg-amber-50/20" : isFinished ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200"
                }`}
              >
                <div
                  onClick={() => toggleRank(rank.name)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition rounded-2xl"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs bg-gradient-to-br ${rank.accentClass} text-white`}>
                      {rank.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#113D60]">{rank.name.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Levels {rank.startLevel}–{rank.endLevel}</span>
                        {isCurrent && <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase bg-amber-400 text-amber-950">Active</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isFinished ? "✓ Segment Completed" : isCurrent ? "● Level 37 Active" : "🔒 Locked"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 pt-1 border-t border-slate-100">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {rankLevels.map((lvl) => {
                        const isTargetCurrent = lvl.levelNumber === currentMember.currentLevel;
                        return (
                          <button
                            key={lvl.levelNumber}
                            type="button"
                            onClick={() => setSelectedLevel(lvl)}
                            className={`py-2 px-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center min-h-[44px] ${
                              isTargetCurrent
                                ? "bg-amber-400 border-amber-500 text-amber-950 ring-2 ring-amber-400/40 font-semibold scale-105"
                                : lvl.status === "CYCLE_COMPLETED" || lvl.status === "REWARD_APPROVED" || lvl.status === "QUALIFIED"
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            {renderStatusIndicator(lvl.status, lvl.levelNumber, isTargetCurrent)}
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              ₹{(minUnit * lvl.levelNumber / 100000).toFixed(1)}L
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── SECTION 23: LEVEL POPUP MODAL ─────────────────────────────────── */}
      {selectedLevel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                  Network Milestone Audit
                </span>
                <h3 className="text-lg font-bold text-[#113D60] tracking-tight">
                  LEVEL {selectedLevel.levelNumber} — {selectedLevel.rankName.toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Level Values conforming to Section 33.25 */}
            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Level:</span>
                <span className="font-semibold text-slate-800">Level {selectedLevel.levelNumber}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Status:</span>
                <span className={`font-semibold uppercase px-2.5 py-0.5 rounded-full text-[10px] ${
                  selectedLevel.levelNumber <= currentMember.currentLevel
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-amber-100 text-amber-900 border border-amber-300"
                }`}>
                  {selectedLevel.levelNumber <= currentMember.currentLevel ? "Completed" : "In Progress"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Business Type:</span>
                <span className="font-semibold text-slate-800">{selectedBusinessType}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Minimum Required:</span>
                <span className="font-semibold text-amber-800">₹{minUnit.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">
                  {selectedLevel.levelNumber <= currentMember.currentLevel ? "Eligible Network Volume Applied:" : "Eligible Volume:"}
                </span>
                <span className="font-semibold text-emerald-700">
                  ₹{(selectedLevel.levelNumber <= currentMember.currentLevel ? minUnit : 0).toLocaleString("en-IN")}
                </span>
              </div>
              {selectedLevel.levelNumber > currentMember.currentLevel && (
                <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                  <span className="text-slate-500 font-medium">Remaining:</span>
                  <span className="font-semibold text-red-600">₹{minUnit.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Qualification Status:</span>
                <span className="font-semibold text-cyan-800">
                  {selectedLevel.levelNumber <= currentMember.currentLevel ? "VERIFIED" : "PENDING"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Cycle:</span>
                <span className="font-bold text-slate-800">Cycle 1</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">
                  {selectedLevel.levelNumber <= currentMember.currentLevel ? "Completed At:" : "Milestone Target:"}
                </span>
                <span className="font-mono text-slate-600">
                  {selectedLevel.completedAt || (selectedLevel.levelNumber <= currentMember.currentLevel ? "Sep 2026" : "Awaiting volume")}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
              <strong>Section 33 Level Rule:</strong> A referral-network transaction must satisfy the minimum qualifying transaction amount applicable to {selectedBusinessType} (₹{minUnit.toLocaleString("en-IN")}) before it can contribute toward completion of a level.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className="px-5 py-2.5 bg-[#113D60] text-white text-xs font-bold rounded-xl"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── SECTION 24: RANK COMPLETION MODAL ─────────────────────────────── */}
      {rankCompletionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-8 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <h3 className="text-base font-bold text-[#113D60]">
                  RANK SPECIFICATION: {rankCompletionModal.rankName.toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRankCompletionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Rank Completion Trigger:</span>
                <span className="font-semibold text-slate-800">Level {rankCompletionModal.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reward Rate:</span>
                <span className="font-semibold text-cyan-800">{rankCompletionModal.rate.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Qualification Amount:</span>
                <span className="font-semibold text-slate-800">₹{rankCompletionModal.amount.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-700">One-Time Rank Reward:</span>
                <span className="font-semibold text-emerald-700 text-sm">₹{rankCompletionModal.reward.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reward Status:</span>
                <span className="font-semibold text-amber-800 uppercase">{rankCompletionModal.status}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-snug">
              <strong>Section 24 Rule:</strong> This reward is generated <strong>once</strong> for completion of the {rankCompletionModal.rankName} Rank milestone level. Prior rank rewards are never repeated.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setRankCompletionModal(null)}
                className="px-5 py-2.5 bg-[#113D60] text-white text-xs font-semibold rounded-xl"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REFERRAL QR CODE MODAL ────────────────────────────────────────── */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#113D60]">NORYVANTA REFERRAL QR</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
              <div className="w-48 h-48 bg-white p-3 rounded-2xl border border-slate-200 shadow-inner flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-full h-full text-[#113D60]">
                  <rect width="100" height="100" fill="white" />
                  <rect x="10" y="10" width="25" height="25" fill="#113D60" />
                  <rect x="15" y="15" width="15" height="15" fill="white" />
                  <rect x="19" y="19" width="7" height="7" fill="#113D60" />
                  <rect x="65" y="10" width="25" height="25" fill="#113D60" />
                  <rect x="70" y="15" width="15" height="15" fill="white" />
                  <rect x="74" y="19" width="7" height="7" fill="#113D60" />
                  <rect x="10" y="65" width="25" height="25" fill="#113D60" />
                  <rect x="15" y="70" width="15" height="15" fill="white" />
                  <rect x="19" y="74" width="7" height="7" fill="#113D60" />
                  <circle cx="50" cy="50" r="10" fill="#113D60" />
                  <path d="M45,45 L55,55 M45,55 L55,45" stroke="white" strokeWidth="2" />
                </svg>
              </div>
              <span className="font-mono text-xs font-semibold text-cyan-800">{currentMember.uaid}</span>
              <p className="text-[10px] text-slate-500">Scan to register under this referral network partner</p>
            </div>

            <button
              type="button"
              onClick={handleCopyReferral}
              className="w-full py-2.5 bg-[#113D60] text-white rounded-xl text-xs font-semibold"
            >
              {copyFeedback ? "Referral Link Copied!" : "Copy Referral Link"}
            </button>
          </div>
        </div>
      )}

      {/* ─── SCAN / VERIFY REFERRAL MODAL ──────────────────────────────────── */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#113D60]">Scan / Verify NRY ID</h3>
              <button
                type="button"
                onClick={() => setScanModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-600 font-semibold">Enter NRY Referral Code to Validate</label>
              <input
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="e.g. NRY-HS-ABC-482913 or NRY-XXXX"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20"
              />

              {scanResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                    scanResult.valid ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  <span>{scanResult.message}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleVerifyScannedCode}
                className="w-full py-2.5 bg-[#113D60] text-white rounded-xl text-xs font-semibold"
              >
                Verify Referral Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUALIFICATION RULES MODAL ─────────────────────────────────────── */}
      {rulesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-[#113D60]">Noryvanta Referral &amp; Rank Rules</h3>
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 max-h-80 overflow-y-auto leading-relaxed">
              <p className="font-bold text-slate-800">1. Rank-Based, Not Level-Based</p>
              <p>
                Reward is rank based, NOT level based. Exactly ONE reward is generated for completion of each Rank milestone level (Level 10, 20, 30, ..., 120). Prior rank rewards are never repeated.
              </p>
              <p className="font-bold text-slate-800">2. Self-Purchase Exclusion</p>
              <p>
                A reward calculation must NEVER be triggered merely because the user makes a self-purchase. The qualifying transaction must satisfy eligible referral relationships.
              </p>
              <p className="font-bold text-slate-800">3. Tax Amount Exclusion</p>
              <p>
                Taxes are strictly excluded from reward calculation. Only the net eligible commercial transaction volume qualifies for rank milestones.
              </p>
              <p className="font-bold text-slate-800">4. Immutable Reversal Ledger</p>
              <p>
                In the event of an order cancellation, return, chargeback, or dispute, a reversal entry is recorded in the ledger. Historical records are never deleted.
              </p>
              <p className="font-bold text-slate-800">5. Non-Withdrawable Cash Rule</p>
              <p>
                Rewards are not withdrawable as cash under the current business rules and are limited to eligible Noryvanta platform purchases/ecosystem use.
              </p>
              <p className="font-bold text-slate-800">6. Progressive Quarterly Purchase &amp; 30-Day Cure Period</p>
              <p>
                To maintain active status, customers must complete at least 1 qualifying purchase each calendar quarter. The system employs a progressive warning workflow: 30-day/15-day reminders &rarr; 7-day final warning &rarr; 30-day Grace Period upon quarter missed &rarr; 7-day final notice before block. A purchase during grace cures the deficiency immediately.
              </p>
              <p className="font-bold text-slate-800">7. Single Permanent UAID &amp; Controlled Reactivation</p>
              <p>
                Every account receives exactly one unique UAID. If an account is blocked for inactivity, historical transactions and ledger entries remain preserved. Controlled reactivation restores the existing UAID upon completing a verified purchase&mdash;the system never generates a replacement UAID. Anti-abuse counters track block and reactivation events.
              </p>
              <p className="font-bold text-slate-800">8. UAID Reactivation Purchase Requirement</p>
              <p>
                When blocked for quarterly inactivity, the required reactivation purchase is calculated automatically server-side: <strong className="text-slate-900">Required Amount = Business Minimum Purchase Unit &times; Number of Missed Quarters</strong>. (Wholesaler: &pound;1,00,000 / Distributor: &pound;10,000 / Retailer &amp; Service: &pound;5,000 per missed quarter). The reactivation purchase is not retroactive&mdash;previous missed quarters remain historically recorded as MISSED to prevent retroactive reward generation.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setRulesModalOpen(false)}
                className="px-5 py-2 bg-[#113D60] text-white text-xs font-semibold rounded-xl"
              >
                Acknowledge &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CYCLE HISTORY MODAL ───────────────────────────────────────────── */}
      {cycleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-[#113D60]">Network Cycle Progression</h3>
              <button
                type="button"
                onClick={() => setCycleModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {CYCLES_DATA.map((cyc) => (
                <div
                  key={cyc.id}
                  className={`p-4 rounded-2xl border transition ${
                    cyc.status === "ACTIVE"
                      ? "bg-amber-50/70 border-amber-300"
                      : "bg-slate-50 border-slate-200 opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#113D60]">{cyc.name}</h4>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        cyc.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {cyc.status === "ACTIVE" ? "Current / Active" : "Locked / Scheduled"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 mt-2 text-xs text-slate-600 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Commencement</span>
                      <span>{cyc.startDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Milestones</span>
                      <span>{cyc.status === "ACTIVE" ? "37 of 120 Levels" : "0 of 120 Levels"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCycleModalOpen(false)}
                className="px-5 py-2 bg-[#113D60] text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
