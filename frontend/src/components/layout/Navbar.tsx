"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  ShieldCheck,
  Sparkles,
  LayoutDashboard,
  Award,
  DollarSign,
  Globe,
  User,
  LogOut,
  Menu,
  X,
  Search
} from "lucide-react";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { locale, setLocale, t } = useI18n();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/products", label: t("nav.marketplace"), icon: Search },
    { href: "/ai-assistant", label: t("nav.ai_assistant"), icon: Sparkles },
    { href: "/dashboard", label: t("nav.dashboard"), icon: LayoutDashboard },
    { href: "/rank-tracker", label: t("nav.rank_tracker"), icon: Award },
    { href: "/admin/fees", label: t("nav.admin_fees"), icon: DollarSign },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-ambient">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center border border-border-medium shadow-ambient group-hover:scale-105 transition-transform">
              <span className="font-headline font-bold text-xl text-white tracking-wider">N</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-headline font-extrabold text-xl tracking-tight text-primary">NORYVANTA</span>
                <span className="text-[10px] font-semibold tracking-wider text-secondary bg-surface-variant px-1.5 py-0.5 rounded">B2B</span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold -mt-0.5">CONNECT. GROW. THRIVE.</p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-secondary font-semibold bg-surface-subtle"
                      : "text-slate-600 hover:text-primary hover:bg-slate-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="hidden md:flex items-center gap-3">
            {/* Escrow badge */}
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-tertiary" />
              <span>{t("nav.escrow_guarantee")}</span>
            </div>

            {/* Language Switcher */}
            <button
              onClick={() => setLocale(locale === "en" ? "hi" : "en")}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-border text-slate-700 hover:bg-slate-50 transition-colors"
              title="Toggle Language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <span>{locale === "en" ? "हिंदी" : "EN"}</span>
            </button>

            {/* Auth CTA */}
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 transition"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>{user.full_name?.split(" ")[0] || "Account"}</span>
                  <span className="text-[10px] bg-primary text-white px-1.5 py-0.2 rounded font-mono">{user.role}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 rounded-md hover:bg-red-50 text-slate-500 hover:text-red-600 transition"
                  title={t("nav.logout")}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-md bg-primary hover:bg-secondary text-white text-xs font-semibold shadow-ambient transition"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setLocale(locale === "en" ? "hi" : "en")}
              className="px-2 py-1 text-xs font-semibold rounded border border-border"
            >
              {locale === "en" ? "हिंदी" : "EN"}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-700 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-white px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-border">
            {user ? (
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">{user.full_name}</span>
                <button onClick={logout} className="text-xs text-red-600 font-semibold">{t("nav.logout")}</button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center py-2 bg-primary text-white text-xs font-semibold rounded-md"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
