"use client";

import React, { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Mail,
  Phone,
  MessageCircle,
  ArrowDownToLine,
  FileDown,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Headphones,
  HelpCircle
} from "lucide-react";
import { UAIDReactivationForm } from "@/components/contact/UAIDReactivationForm";

export default function ContactPage() {
  const formSectionRef = useRef<HTMLDivElement>(null);

  const scrollToForm = () => {
    if (formSectionRef.current) {
      formSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* ─── HERO HEADER SECTION ───────────────────────────────────── */}
      <section className="bg-gradient-to-b from-[#113D60] to-[#0d2e49] text-white pt-12 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 text-center">
          {/* Logo & Company Name */}
          <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 mb-6">
            <div className="w-8 h-8 relative flex items-center justify-center shrink-0">
              <Image
                src="/logo-icon.png"
                alt="Noryvanta - Global"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div className="flex items-baseline gap-1.5 text-left">
              <span className="font-extrabold text-lg text-white tracking-tight">
                Noryvanta
              </span>
              <span className="font-medium text-slate-300 text-sm tracking-tight">
                - Global
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
            Contact Support &amp; Services
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mt-3 leading-relaxed">
            Get in touch directly with Noryvanta - Global support. Reach our official channels or file your online UAID reactivation request.
          </p>

        </div>
      </section>

      {/* ─── CONTACT CARDS SECTION (Display Requirements 2 - 6) ──────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Official Email */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl flex flex-col justify-between hover:shadow-2xl transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#113D60] mb-4">
                <Mail className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official Support Email
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                support@noryvantaglobal.com
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Send official inquiries, billing questions, compliance documents, or general platform queries.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <a
                href="mailto:support@noryvantaglobal.com"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#113D60] hover:text-cyan-700 transition"
              >
                <span>Send Email</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 2: Phone Call */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl flex flex-col justify-between hover:shadow-2xl transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 mb-4">
                <Phone className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Customer Support Call
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                +91 75078 97697
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Connect directly with our support desk during business hours for immediate phone assistance.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <a
                href="tel:+917507897697"
                className="inline-flex items-center gap-2 text-xs font-bold text-[#113D60] hover:text-cyan-700 transition"
              >
                <span>Call Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Card 3: WhatsApp Click-to-Chat */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xl flex flex-col justify-between hover:shadow-2xl transition duration-300">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Official WhatsApp Desk
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                +91 75078 97697
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Quick verification, ticket updates, and instant query resolution via verified WhatsApp chat.
              </p>
            </div>
            <div className="pt-5 mt-4 border-t border-slate-100">
              <a
                href="https://wa.me/917507897697"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
              >
                <span>Chat on WhatsApp</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* ─── PROMINENT UAID REACTIVATION BANNER (Requirement 6) ─────── */}
        <div className="mt-8 bg-gradient-to-r from-[#113D60] via-[#0E4A71] to-[#113D60] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-cyan-500/30">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
              Account Restoration Service
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Need to restore a blocked or inactive UAID?
            </h2>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl">
              Fill out the official Form UAID-REACT-01 online. Calculate qualifying reactivation purchase amounts and submit directly to official support.
            </p>
          </div>

          <div className="shrink-0">
            {/* Prominent Button with Download-style Icon (Req 6 & 15: Opens online form, does NOT download blank file) */}
            <button
              type="button"
              onClick={scrollToForm}
              className="px-6 sm:px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-[#113D60] font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2.5 cursor-pointer transform hover:scale-[1.02]"
              title="Open the online UAID Reactivation Form"
            >
              <ArrowDownToLine className="w-4 h-4 text-[#113D60]" />
              <span>UAID Reactivation Form</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── ONLINE UAID REACTIVATION FORM SECTION (Ref Anchor) ──────── */}
      <section ref={formSectionRef} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="text-center mb-8">
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
            Official Online Filing
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#113D60] tracking-tight mt-2">
            UAID Reactivation Form
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
            Request reactivation of your blocked/inactive UAID under official Noryvanta Global business rules.
          </p>
        </div>

        {/* Embedded Interactive Writable & Clickable Form Component */}
        <UAIDReactivationForm standalone={true} />
      </section>

      {/* ─── COMPLIANCE & ESCROW SECURITY GUARANTEE ──────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">
                Controlled Single UAID Identity Guarantee
              </span>
              <p className="text-slate-500 text-[11px]">
                Restores original historical ledger without generating duplicate or replacement UAIDs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
            <span>DPDP Act 2023 Compliant</span>
            <span>•</span>
            <span>RBI Escrow Standard</span>
            <span>•</span>
            <span>Sovereign Tier-IV Host</span>
          </div>
        </div>
      </section>
    </div>
  );
}
