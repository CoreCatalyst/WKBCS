"use client";

import React from "react";
import Link from "next/link";
import { NetworkProgressTracker } from "@/components/network/NetworkProgressTracker";
import { ArrowLeft, ChevronRight, Award } from "lucide-react";

export default function RankTrackerPage() {
  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top Breadcrumb & Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-800 flex items-center gap-1">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-[#113D60] font-bold">Network Progress</span>
            </div>

            <Link
              href="/dashboard"
              className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1"
            >
              <span>Back to Business Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <NetworkProgressTracker />
      </div>
    </div>
  );
}
