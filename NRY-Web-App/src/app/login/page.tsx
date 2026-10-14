"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import tokenStore from "@/services/tokenStore";
import {
  Phone,
  Mail,
  Lock,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Crown,
  Sparkles
} from "lucide-react";

export default function BusinessLoginPage() {
  const router = useRouter();
  const { loginWithOTP } = useAuth();

  // Mode: "OTP" or "PASSWORD"
  const [loginMethod, setLoginMethod] = useState<"OTP" | "PASSWORD">("OTP");

  // Mobile + OTP fields
  const [mobile, setMobile] = useState("+91 98765 43210");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Email + Password fields
  const [email, setEmail] = useState("owner@apexinstruments.in");
  const [password, setPassword] = useState("••••••••••••");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = mobile.trim().replace(/[^\d+]/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setMessage({ type: "error", text: "Please enter your valid registered mobile number." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.post("/auth/otp/request", {
        identifier: cleanPhone,
        channel: "SMS"
      });
      setOtpSent(true);
      if (res.data?.dev_otp_preview) {
        setDevOtp(res.data.dev_otp_preview);
      } else {
        setDevOtp(null);
      }
      setMessage({ type: "success", text: res.data?.message || "Verification code dispatched via SMS." });
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.detail || "Failed to dispatch verification code. Please check your mobile number and retry."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setMessage({ type: "error", text: "Please enter the 6-digit OTP." });
      return;
    }
    setLoading(true);
    try {
      await loginWithOTP(mobile, otpCode.trim(), "VENDOR");
      setMessage({ type: "success", text: "Login verified! Redirecting to Business Dashboard..." });
      setTimeout(() => {
        router.push("/dashboard");
      }, 700);
    } catch (e) {
      setMessage({ type: "error", text: "Invalid verification code. Please retry." });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setMessage({ type: "error", text: "Please enter both email and password." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.post("/auth/login/password", {
        email: email.trim(),
        password: password.trim(),
      });
      const data = res.data;
      if (data?.access_token) {
        tokenStore.setToken(data.access_token);
        localStorage.setItem(
          "noryvanta_user",
          JSON.stringify({
            id: data.user_id,
            email: data.email || email,
            phone: data.phone,
            role: data.role,
            full_name: data.full_name || (data.role === "VENDOR" ? "Apex Instruments" : "Procurement Partner"),
            is_verified: true,
            has_business_profile: data.has_business_profile
          })
        );
        setMessage({ type: "success", text: "Authentication verified! Redirecting to Dashboard..." });
        setTimeout(() => {
          router.push("/dashboard");
        }, 600);
      }
    } catch (err: any) {
      const errorDetail = err.response?.data?.detail || "Invalid email or password.";
      setMessage({ type: "error", text: errorDetail });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-[490px] w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-7 space-y-4">
        {/* Brand Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex flex-col items-center group">
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

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#113D60] mt-2 sm:mt-2.5">
            Business Login
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Sign in to manage your business profile, products, and customer orders.
          </p>
        </div>

        {/* Tab Toggle: Mobile + OTP vs Email + Password */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("OTP");
              setMessage(null);
            }}
            className={`py-2 text-xs font-medium rounded-lg transition ${
              loginMethod === "OTP"
                ? "bg-white text-[#113D60] shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Mobile + OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod("PASSWORD");
              setMessage(null);
            }}
            className={`py-2 text-xs font-medium rounded-lg transition ${
              loginMethod === "PASSWORD"
                ? "bg-white text-[#113D60] shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Email + Password
          </button>
        </div>

        {/* ─── Mandatory Referral NRY ID Notice for 1st Time Login (Requirements 4 & 5) ─── */}
        <div className="p-3 bg-gradient-to-br from-cyan-950/10 via-slate-50 to-slate-100 rounded-xl border border-cyan-700/25 space-y-1.5 text-xs text-slate-800">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-1.5 text-[#113D60] text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-700 shrink-0" />
              <span>First-Time Commercial Onboarding</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold">
              Referral Mandatory
            </span>
          </div>
          <p className="text-[10.5px] text-slate-600 leading-snug">
            First-time business registration and onboarding strictly requires an active <strong>Referral NRY ID</strong>. Unregistered businesses cannot complete login without onboarding under a network sponsor.
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10.5px]">
            <Link
              href="/register"
              className="font-bold text-cyan-800 hover:text-cyan-950 underline flex items-center gap-1"
            >
              <span>Onboard with Referral NRY ID →</span>
            </Link>
            <Link
              href="/register"
              className="font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 text-[10px]"
            >
              <Crown className="w-3 h-3 text-amber-500" />
              <span>Owner Genesis Mode</span>
            </Link>
          </div>
        </div>

        {/* Status Alerts */}
        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Option 1: Mobile + OTP */}
        {loginMethod === "OTP" ? (
          !otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Registered Business Mobile Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Sending..." : "Send Verification OTP"}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Enter 6-Digit OTP Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] font-semibold text-cyan-700 hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl text-center font-mono font-bold tracking-widest text-[#113D60] focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                  />
                </div>
                {devOtp && (
                  <p className="text-[11px] text-emerald-600 font-semibold mt-1">
                    Demo Code Available: <span className="font-mono">{devOtp}</span>
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? "Verifying..." : "Verify & Access Dashboard"}</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </button>
            </form>
          )
        ) : (
          /* Option 2: Email + Password */
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Business Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@company.in"
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Password</label>
                {/* Exact Link from Section 3 */}
                <button
                  type="button"
                  onClick={() => setMessage({ type: "success", text: "Password reset link dispatched to your email." })}
                  className="text-[11px] font-semibold text-cyan-700 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#113D60]/20 focus:border-[#113D60]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-ambient flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? "Signing in..." : "Sign In to Dashboard"}</span>
              <ArrowRight className="w-4 h-4 text-cyan-400" />
            </button>
          </form>
        )}

        {/* Onboarding & Genesis Gateway Links */}
        <div className="pt-3 border-t border-slate-100 space-y-2 text-center text-xs text-slate-500">
          <p className="text-[11.5px] sm:text-xs text-slate-600 whitespace-nowrap">
            Don&apos;t have a business account yet?{" "}
            <Link href="/register" className="font-bold text-[#113D60] hover:text-cyan-700 underline">
              Register with Referral NRY ID
            </Link>
          </p>
          <div className="p-2 sm:p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[10.5px] sm:text-[11px] text-amber-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-left">
              <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Platform Owner Day 0 Bootstrap:</span>
            </span>
            <Link
              href="/register"
              className="font-bold text-amber-800 hover:underline shrink-0"
            >
              Genesis Initialization →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
