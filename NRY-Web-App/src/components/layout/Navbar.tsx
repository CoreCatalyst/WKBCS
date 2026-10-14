"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useCountry } from "@/contexts/CountryContext";
import { useI18n } from "@/contexts/I18nContext";
import { CountrySelectorModal } from "@/components/common/CountrySelectorModal";
import { LanguageSelectorModal } from "@/components/common/LanguageSelectorModal";
import { HowItWorksModal } from "@/components/common/HowItWorksModal";
import { CountryFlag } from "@/components/common/CountryFlag";
import {
  Menu,
  X,
  ChevronDown,
  Building2,
  LayoutDashboard,
  User,
  Globe,
  Languages,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  LogOut,
  Settings,
  Sparkles
} from "lucide-react";

/**
 * Generate 2-character initials dynamically from a user or business name.
 * Example: "Acme Technologies" -> "AT", "Noryvanta Foods" -> "NF"
 */
function getInitials(name?: string): string {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { country } = useCountry();
  const { locale, currentLanguage, t } = useI18n();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  // Dynamic naming and initials calculation
  const businessName = user?.business_name || user?.full_name || (user?.role === "VENDOR" ? "Apex Instruments" : "Procurement Buyer");
  const initials = getInitials(businessName);

  const navLinks = [
    { href: "/", label: t("nav.home") || "Home" },
    { href: "/products", label: "Explore Products & Services" },
    { href: "/businesses", label: t("nav.businesses") || "Businesses" },
    { href: "/#how-it-works", label: t("nav.how_it_works") || "How It Works" },
    { href: "/contact", label: t("nav.contact") || "Contact" },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all w-full">
        {/* Full-width container spanning 100% of the viewport width without restrictive max-w constraints */}
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
          <div className="flex items-center justify-between h-16 sm:h-[68px] w-full gap-2 lg:gap-4 xl:gap-6">
            
            {/* ─── 1. Brand Logo & Tagline (Left) ─── */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
              <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logo-icon.png"
                  alt="Noryvanta - Global"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-bold text-lg sm:text-2xl tracking-tight leading-none text-[#113D60]">
                    Noryvanta
                  </span>
                  <span className="text-sm sm:text-lg font-medium text-slate-500 tracking-tight leading-none">
                    - Global
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] font-medium text-cyan-600 mt-0.5 select-none tracking-normal hidden xl:block">
                  Connect. Supply. Empower.
                </p>
              </div>
            </Link>

            {/* ─── 2. Desktop Navigation Links (Center) ─── */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 2xl:gap-2 flex-nowrap whitespace-nowrap">
              {navLinks.map((item) => {
                if (item.href === "/#how-it-works") {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => setHowItWorksOpen(true)}
                      className="px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-medium transition-all duration-200 text-slate-700 hover:text-[#113D60] bg-transparent hover:bg-slate-100/80 border border-transparent hover:border-slate-300 shadow-2xs hover:shadow-xs cursor-pointer whitespace-nowrap"
                    >
                      {item.label}
                    </button>
                  );
                }
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-2.5 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] transition-all duration-200 border whitespace-nowrap ${
                      isActive
                        ? "text-[#113D60] font-semibold bg-slate-100/90 border-slate-300/80 shadow-xs"
                        : "text-slate-700 font-medium hover:text-[#113D60] bg-transparent hover:bg-slate-100/80 border-transparent hover:border-slate-300 shadow-2xs hover:shadow-xs"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* ─── 3. Top-right Navigation Cluster (Right) ─── */}
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-2.5 2xl:gap-3 shrink-0 flex-nowrap">
              {/* Country Selector: Tablet Pill with Flag */}
              <button
                type="button"
                onClick={() => setCountryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-cyan-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition shadow-2xs cursor-pointer whitespace-nowrap"
                aria-label={`Select country, currently ${country.name}`}
              >
                <CountryFlag code={country.code} size="sm" />
                <span>{country.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Language Selector */}
              <button
                type="button"
                onClick={() => setLanguageModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-cyan-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition shadow-2xs cursor-pointer whitespace-nowrap"
                title="Select Language"
                aria-label={`Select language, currently ${currentLanguage.nativeName}`}
              >
                <Languages className="w-3.5 h-3.5 text-cyan-600" />
                <span>{currentLanguage.nativeName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Business Login / Dashboard Action */}
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-medium text-[#113D60] hover:bg-slate-100 border border-transparent hover:border-slate-200 transition whitespace-nowrap"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-3 xl:px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-medium text-[#113D60] hover:bg-slate-100 border border-transparent hover:border-slate-200 transition whitespace-nowrap"
                >
                  {t("nav.login") || "Business Login"}
                </Link>
              )}

              {/* Primary CTA: Register Business */}
              <Link
                href="/register"
                className="px-3.5 xl:px-4 py-1.5 rounded-full text-xs xl:text-[13px] font-semibold text-white bg-[#113D60] hover:bg-slate-800 shadow-xs hover:shadow-sm transition flex items-center gap-1.5 whitespace-nowrap border border-cyan-500/40 hover:border-cyan-400"
              >
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t("nav.register") || "Register Business"}</span>
              </Link>

              {/* ─── 4. Profile / Business Account Icon (Immediately Beside CTA) ─── */}
              {user ? (
                /* Authenticated State: Avatar / Dynamic Initial with Dropdown */
                <div ref={profileDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer group outline-none ${
                      profileDropdownOpen || pathname.startsWith("/dashboard")
                        ? "ring-2 ring-[#113D60] ring-offset-2"
                        : "hover:ring-2 hover:ring-slate-300"
                    }`}
                    title={businessName}
                    aria-label={`User account menu for ${businessName}`}
                    aria-expanded={profileDropdownOpen}
                  >
                    {user.profile_picture ? (
                      <div className="w-full h-full rounded-full overflow-hidden border border-slate-200">
                        <Image
                          src={user.profile_picture}
                          alt={businessName}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#113D60] text-white font-bold text-xs flex items-center justify-center tracking-wider shadow-inner select-none">
                        {initials}
                      </div>
                    )}
                    {/* Live Verified Online Status Dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      {/* Business / User Header */}
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        {user.profile_picture ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                            <Image
                              src={user.profile_picture}
                              alt={businessName}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#113D60] text-white font-bold text-xs flex items-center justify-center tracking-wider shrink-0 shadow-inner">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#113D60] truncate">{businessName}</p>
                          <p className="text-[10px] text-slate-500 truncate font-mono">
                            {user.email || user.phone || "Active Enterprise"}
                          </p>
                          <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Verified Business
                          </span>
                        </div>
                      </div>

                      {/* Navigation Links */}
                      <div className="py-1 text-xs">
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:text-[#113D60] hover:bg-slate-50 transition font-medium"
                        >
                          <LayoutDashboard className="w-4 h-4 text-cyan-700" />
                          <span>Business Dashboard</span>
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:text-[#113D60] hover:bg-slate-50 transition font-medium"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          <span>My Profile</span>
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:text-[#113D60] hover:bg-slate-50 transition font-medium"
                        >
                          <ShoppingBag className="w-4 h-4 text-slate-500" />
                          <span>Orders &amp; Escrow</span>
                        </Link>
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 hover:text-[#113D60] hover:bg-slate-50 transition font-medium"
                        >
                          <Settings className="w-4 h-4 text-slate-500" />
                          <span>Settings</span>
                        </Link>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-1 mt-1 border-t border-slate-100 px-2">
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setProfileDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated State: Clean Circular User/Profile Icon */
                <Link
                  href="/login"
                  className="relative flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-[#113D60] border border-slate-200/90 transition-all shadow-2xs hover:shadow-xs cursor-pointer group outline-none"
                  title="Business Login / Account"
                  aria-label="Sign In to Business Account"
                >
                  <User className="w-4 h-4 text-slate-600 group-hover:text-[#113D60] transition-colors" />
                </Link>
              )}

            </div>

            {/* ─── Mobile / Tablet Hamburger Button ─── */}
            <div className="flex items-center gap-2 lg:hidden">
              <button
                type="button"
                onClick={() => setCountryModalOpen(true)}
                className="px-2.5 py-1.5 rounded-full border border-slate-200 text-xs font-medium flex items-center gap-1.5 bg-slate-50"
                aria-label="Select Country"
              >
                <CountryFlag code={country.code} size="sm" />
                <span className="uppercase text-[11px] font-semibold">{country.currency.code}</span>
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-700 hover:text-[#113D60] rounded-full hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* ─── Mobile Drawer Menu ─── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl">
            {/* Quick Country & Language Toggles */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCountryModalOpen(true);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
              >
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-cyan-600" />
                  <span>Country</span>
                </span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <CountryFlag code={country.code} size="sm" />
                  <span>{country.name}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setLanguageModalOpen(true);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
              >
                <span className="flex items-center gap-1.5">
                  <Languages className="w-4 h-4 text-cyan-600" />
                  <span>Language</span>
                </span>
                <span className="font-semibold text-cyan-700">{currentLanguage.nativeName}</span>
              </button>
            </div>

            {/* Navigation links */}
            <div className="space-y-1.5">
              {navLinks.map((item) => {
                if (item.href === "/#how-it-works") {
                  return (
                    <button
                      key={item.href}
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setHowItWorksOpen(true);
                      }}
                      className="w-full text-left block px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:text-cyan-700 hover:bg-cyan-50/50 border border-transparent hover:border-cyan-300 transition cursor-pointer"
                    >
                      {item.label}
                    </button>
                  );
                }
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2.5 rounded-xl text-sm transition border ${
                      isActive
                        ? "text-[#113D60] bg-slate-100 border-slate-300/80 font-semibold"
                        : "text-slate-700 font-medium hover:text-cyan-700 hover:bg-cyan-50/50 border-transparent hover:border-cyan-300"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Auth Actions Cluster for Mobile */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition"
                  >
                    {user.profile_picture ? (
                      <div className="relative w-10 h-10 rounded-full overflow-hidden border border-slate-200 shrink-0">
                        <Image
                          src={user.profile_picture}
                          alt={businessName}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                    ) : (
                      <div className="relative w-10 h-10 rounded-full bg-[#113D60] text-white font-bold text-xs flex items-center justify-center tracking-wider shrink-0 shadow-inner">
                        {initials}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#113D60] truncate">{businessName}</p>
                      <p className="text-[10px] text-slate-500 truncate font-mono">
                        {user.email || user.phone || "Active Enterprise"}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="py-2.5 text-center text-xs font-medium text-[#113D60] bg-slate-100 rounded-xl"
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="py-2.5 text-center text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center text-xs font-medium text-[#113D60] border border-slate-300 rounded-xl"
                  >
                    Business Login
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 text-center text-xs font-medium text-slate-700 bg-slate-100 rounded-xl"
                  >
                    Account / Hub
                  </Link>
                </div>
              )}

              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold text-white bg-[#113D60] rounded-xl flex items-center justify-center gap-2 border border-cyan-500/40 shadow-xs"
              >
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span>Register Business</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* How It Works Modal */}
      <HowItWorksModal
        isOpen={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />

      {/* Modals for Country and Language */}
      <CountrySelectorModal
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
      />

      <LanguageSelectorModal
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
      />
    </>
  );
};
