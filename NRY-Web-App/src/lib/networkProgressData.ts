export type LevelStatus =
  | "LOCKED"
  | "IN_PROGRESS"
  | "TRANSACTION_RECEIVED"
  | "UNDER_VERIFICATION"
  | "QUALIFIED"
  | "REWARD_PENDING"
  | "REWARD_APPROVED"
  | "REVERSED"
  | "CYCLE_COMPLETED";

export interface LevelTimelineEvent {
  step: string;
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING";
  timestamp?: string;
  details?: string;
}

export interface NetworkLevelRecord {
  levelNumber: number;
  rankName: string;
  cycle: string;
  status: LevelStatus;
  transactionStatus: "None" | "Received" | "Under Review" | "Verified" | "Rejected";
  verificationStatus: "Not Started" | "In Review" | "Verified" | "Failed";
  qualificationStatus: "Pending" | "In Progress" | "Qualified" | "Disqualified";
  rewardStatus: "Locked" | "Not Applicable" | "Reward Pending" | "Reward Approved" | "Reversed";
  transactionRef?: string;
  amountInr?: number;
  completedAt?: string;
  updatedAt: string;
  timeline: LevelTimelineEvent[];
  reversalReason?: string;
}

export interface RankDefinition {
  name: string;
  startLevel: number;
  endLevel: number;
  themeColor: string;
  accentClass: string;
  bgLightClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  description: string;
}

export const NETWORK_RANKS: RankDefinition[] = [
  {
    name: "Bronze",
    startLevel: 1,
    endLevel: 10,
    themeColor: "#b45309",
    accentClass: "from-amber-700 to-amber-900",
    bgLightClass: "bg-amber-50/60",
    borderClass: "border-amber-300",
    textClass: "text-amber-800",
    badgeBg: "bg-amber-100 text-amber-900",
    description: "Foundational membership tier for verified initial commercial transactions."
  },
  {
    name: "Silver",
    startLevel: 11,
    endLevel: 20,
    themeColor: "#64748b",
    accentClass: "from-slate-400 to-slate-600",
    bgLightClass: "bg-slate-50",
    borderClass: "border-slate-300",
    textClass: "text-slate-700",
    badgeBg: "bg-slate-200 text-slate-800",
    description: "Established supplier grade with verified milestone execution track record."
  },
  {
    name: "Panna",
    startLevel: 21,
    endLevel: 30,
    themeColor: "#059669",
    accentClass: "from-emerald-500 to-emerald-700",
    bgLightClass: "bg-emerald-50/60",
    borderClass: "border-emerald-300",
    textClass: "text-emerald-800",
    badgeBg: "bg-emerald-100 text-emerald-900",
    description: "High-integrity regional vendor tier demonstrating consistent escrow turnaround."
  },
  {
    name: "Gold",
    startLevel: 31,
    endLevel: 40,
    themeColor: "#d97706",
    accentClass: "from-yellow-500 to-amber-600",
    bgLightClass: "bg-amber-50/70",
    borderClass: "border-amber-400",
    textClass: "text-amber-900",
    badgeBg: "bg-amber-200 text-amber-950 font-semibold",
    description: "Strategic enterprise merchant tier with multi-city supply fulfillment."
  },
  {
    name: "Platinum",
    startLevel: 41,
    endLevel: 50,
    themeColor: "#0284c7",
    accentClass: "from-sky-500 to-cyan-700",
    bgLightClass: "bg-sky-50/60",
    borderClass: "border-sky-300",
    textClass: "text-sky-800",
    badgeBg: "bg-sky-100 text-sky-900",
    description: "Institutional sovereign contractor grade with high-volume industrial capability."
  },
  {
    name: "Ruby",
    startLevel: 51,
    endLevel: 60,
    themeColor: "#e11d48",
    accentClass: "from-rose-500 to-red-700",
    bgLightClass: "bg-rose-50/60",
    borderClass: "border-rose-300",
    textClass: "text-rose-800",
    badgeBg: "bg-rose-100 text-rose-900",
    description: "Apex manufacturing alliance tier with guaranteed SLA commitments."
  },
  {
    name: "Sapphire",
    startLevel: 61,
    endLevel: 70,
    themeColor: "#2563eb",
    accentClass: "from-blue-600 to-indigo-800",
    bgLightClass: "bg-blue-50/60",
    borderClass: "border-blue-300",
    textClass: "text-blue-800",
    badgeBg: "bg-blue-100 text-blue-900",
    description: "Pan-India logistics synchronized enterprise partner."
  },
  {
    name: "Emerald",
    startLevel: 71,
    endLevel: 80,
    themeColor: "#10b981",
    accentClass: "from-emerald-600 to-teal-800",
    bgLightClass: "bg-emerald-50/70",
    borderClass: "border-emerald-300",
    textClass: "text-emerald-900",
    badgeBg: "bg-emerald-200 text-emerald-950",
    description: "Premier sustainable enterprise supplier with export grade certification."
  },
  {
    name: "Diamond",
    startLevel: 81,
    endLevel: 90,
    themeColor: "#06b6d4",
    accentClass: "from-cyan-400 to-blue-600",
    bgLightClass: "bg-cyan-50/60",
    borderClass: "border-cyan-300",
    textClass: "text-cyan-900",
    badgeBg: "bg-cyan-100 text-cyan-950",
    description: "Diamond-grade corporate merchant with instant milestone liquidity."
  },
  {
    name: "Black Diamond",
    startLevel: 91,
    endLevel: 100,
    themeColor: "#0f172a",
    accentClass: "from-slate-800 to-black",
    bgLightClass: "bg-slate-100",
    borderClass: "border-slate-800",
    textClass: "text-slate-900",
    badgeBg: "bg-slate-900 text-white",
    description: "Elite private consortium partner with sovereign escrow privileges."
  },
  {
    name: "Mythic",
    startLevel: 101,
    endLevel: 110,
    themeColor: "#7c3aed",
    accentClass: "from-purple-600 to-indigo-900",
    bgLightClass: "bg-purple-50/60",
    borderClass: "border-purple-300",
    textClass: "text-purple-900",
    badgeBg: "bg-purple-100 text-purple-950",
    description: "Institutional conglomerate tier powering multi-sector supply networks."
  },
  {
    name: "Legendary",
    startLevel: 111,
    endLevel: 120,
    themeColor: "#eab308",
    accentClass: "from-amber-400 to-yellow-600",
    bgLightClass: "bg-yellow-50/70",
    borderClass: "border-yellow-400",
    textClass: "text-yellow-950",
    badgeBg: "bg-yellow-200 text-yellow-950 font-semibold",
    description: "The pinnacle of Noryvanta network progress. Maximum sovereign autonomy."
  }
];

// Generate exact 120 levels based on user state
// Consumer: A, UAID: NRY-XXXX, Cycle 1, Current Level 37, Rank Gold, KYC Verified
export function generateInitialLevels(): NetworkLevelRecord[] {
  const levels: NetworkLevelRecord[] = [];

  for (let i = 1; i <= 120; i++) {
    // Determine rank
    const rank = NETWORK_RANKS.find((r) => i >= r.startLevel && i <= r.endLevel) || NETWORK_RANKS[0];

    let status: LevelStatus = "LOCKED";
    let transactionStatus: NetworkLevelRecord["transactionStatus"] = "None";
    let verificationStatus: NetworkLevelRecord["verificationStatus"] = "Not Started";
    let qualificationStatus: NetworkLevelRecord["qualificationStatus"] = "Pending";
    let rewardStatus: NetworkLevelRecord["rewardStatus"] = "Locked";
    let completedAt: string | undefined = undefined;
    let reversalReason: string | undefined = undefined;

    const timeline: LevelTimelineEvent[] = [
      { step: "Transaction Received", status: "PENDING" },
      { step: "Verification Started", status: "PENDING" },
      { step: "Verification Completed", status: "PENDING" },
      { step: "Qualification Confirmed", status: "PENDING" },
      { step: "Reward Processing", status: "PENDING" }
    ];

    if (i <= 10) {
      // Bronze completed
      status = i === 10 ? "CYCLE_COMPLETED" : "REWARD_APPROVED";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Approved";
      completedAt = "Aug 15, 2026";
      timeline.forEach((t) => (t.status = "COMPLETED"));
    } else if (i <= 20) {
      // Silver completed
      status = i === 20 ? "CYCLE_COMPLETED" : "REWARD_APPROVED";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Approved";
      completedAt = "Sep 01, 2026";
      timeline.forEach((t) => (t.status = "COMPLETED"));
    } else if (i <= 30) {
      // Panna completed
      status = i === 30 ? "CYCLE_COMPLETED" : "REWARD_APPROVED";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Approved";
      completedAt = "Sep 18, 2026";
      timeline.forEach((t) => (t.status = "COMPLETED"));
    } else if (i >= 31 && i <= 35) {
      // Gold 31-35 approved
      status = "REWARD_APPROVED";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Approved";
      completedAt = "Sep 25, 2026";
      timeline.forEach((t) => (t.status = "COMPLETED"));
    } else if (i === 36) {
      // Gold 36 qualified
      status = "QUALIFIED";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Pending";
      completedAt = "Sep 30, 2026";
      timeline[0].status = "COMPLETED";
      timeline[1].status = "COMPLETED";
      timeline[2].status = "COMPLETED";
      timeline[3].status = "COMPLETED";
      timeline[4].status = "IN_PROGRESS";
    } else if (i === 37) {
      // Current level: 37
      status = "REWARD_PENDING";
      transactionStatus = "Verified";
      verificationStatus = "Verified";
      qualificationStatus = "Qualified";
      rewardStatus = "Reward Pending";
      timeline[0].status = "COMPLETED";
      timeline[1].status = "COMPLETED";
      timeline[2].status = "COMPLETED";
      timeline[3].status = "COMPLETED";
      timeline[4].status = "IN_PROGRESS";
      timeline[4].details = "Audited transaction passed escrow review; awaiting batch disbursement cycle.";
    } else if (i === 38) {
      // Level 38: Under Verification
      status = "UNDER_VERIFICATION";
      transactionStatus = "Received";
      verificationStatus = "In Review";
      qualificationStatus = "In Progress";
      rewardStatus = "Locked";
      timeline[0].status = "COMPLETED";
      timeline[1].status = "IN_PROGRESS";
      timeline[1].details = "Escrow nodal audit checking dispatch milestone and 72-hour return window.";
    } else if (i === 39) {
      // Level 39: Transaction Received
      status = "TRANSACTION_RECEIVED";
      transactionStatus = "Received";
      verificationStatus = "Not Started";
      qualificationStatus = "Pending";
      rewardStatus = "Locked";
      timeline[0].status = "COMPLETED";
      timeline[0].details = "Transaction payload logged from gateway; queued for rule validation.";
    } else if (i === 40) {
      // Level 40: Target to complete Gold rank
      status = "IN_PROGRESS";
      transactionStatus = "None";
      verificationStatus = "Not Started";
      qualificationStatus = "Pending";
      rewardStatus = "Locked";
    } else {
      // Platinum through Legendary (41 - 120)
      status = "LOCKED";
      transactionStatus = "None";
      verificationStatus = "Not Started";
      qualificationStatus = "Pending";
      rewardStatus = "Locked";
    }

    levels.push({
      levelNumber: i,
      rankName: rank.name,
      cycle: "Cycle 1",
      status,
      transactionStatus,
      verificationStatus,
      qualificationStatus,
      rewardStatus,
      transactionRef: i <= 39 ? `NRY-TXN-${10000 + i}` : undefined,
      amountInr: i <= 39 ? 25000 + (i * 1250) : undefined,
      completedAt,
      updatedAt: "2026-10-02T18:30:00Z",
      timeline,
      reversalReason
    });
  }

  return levels;
}

export interface ActivityTimelineItem {
  id: string;
  levelNumber: number;
  action: string;
  status: LevelStatus;
  timeAgo: string;
  date: string;
  note: string;
}

export const RECENT_NETWORK_ACTIVITIES: ActivityTimelineItem[] = [
  {
    id: "act-1",
    levelNumber: 36,
    action: "Level 36 — Qualified",
    status: "QUALIFIED",
    timeAgo: "Today",
    date: "02 Oct 2026, 02:45 PM",
    note: "All milestone and statutory verification rules fulfilled."
  },
  {
    id: "act-2",
    levelNumber: 37,
    action: "Level 37 — Reward Pending",
    status: "REWARD_PENDING",
    timeAgo: "Today",
    date: "02 Oct 2026, 11:20 AM",
    note: "Qualification confirmed; queued for scheduled cycle batch processing."
  },
  {
    id: "act-3",
    levelNumber: 38,
    action: "Level 38 — Under Verification",
    status: "UNDER_VERIFICATION",
    timeAgo: "Yesterday",
    date: "01 Oct 2026, 04:10 PM",
    note: "Transaction received & being reviewed according to Noryvanta verification rules."
  },
  {
    id: "act-4",
    levelNumber: 39,
    action: "Level 39 — Transaction Received",
    status: "TRANSACTION_RECEIVED",
    timeAgo: "Yesterday",
    date: "01 Oct 2026, 09:30 AM",
    note: "Transaction payload logged from gateway; awaiting verification queue."
  }
];

export interface CycleInfo {
  id: string;
  name: string;
  status: "ACTIVE" | "COMPLETED" | "LOCKED";
  startDate: string;
  endDate?: string;
  completedLevels: number;
  totalLevels: number;
  currentLevel: number;
}

export const CYCLES_DATA: CycleInfo[] = [
  {
    id: "cyc-1",
    name: "Cycle 1",
    status: "ACTIVE",
    startDate: "01 Aug 2026",
    completedLevels: 36,
    totalLevels: 120,
    currentLevel: 37
  },
  {
    id: "cyc-2",
    name: "Cycle 2",
    status: "LOCKED",
    startDate: "Scheduled after Cycle 1 Completion",
    completedLevels: 0,
    totalLevels: 120,
    currentLevel: 0
  }
];

export interface RankRewardBenchmark {
  rankNumber: number;
  rankName: string;
  startLevel: number;
  endLevel: number;
  completionLevel: number;
  multiplier: number;
  rewardRate: number;
  qualificationAmount: number;
  rewardAmount: number;
}

export function getRankRewardBenchmark(
  businessType: "Wholesaler" | "Distributor" | "Services" | "Retailer",
  rankNumber: number
): RankRewardBenchmark {
  const unit = businessType === "Wholesaler" ? 100000 : businessType === "Distributor" ? 10000 : 5000;
  const spec = NETWORK_RANKS[rankNumber - 1];
  const multiplier = rankNumber * (rankNumber * 10 + 1);
  const qualAmt = unit * multiplier;
  const rate = Number((1.0 + rankNumber * 0.1).toFixed(2));
  const reward = Math.round(qualAmt * (rate / 100));

  return {
    rankNumber,
    rankName: spec.name,
    startLevel: spec.startLevel,
    endLevel: spec.endLevel,
    completionLevel: spec.endLevel,
    multiplier,
    rewardRate: rate,
    qualificationAmount: qualAmt,
    rewardAmount: reward
  };
}

