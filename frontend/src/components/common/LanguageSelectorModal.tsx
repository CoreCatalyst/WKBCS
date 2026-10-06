"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { useCountry } from "@/contexts/CountryContext";
import {
  SUPPORTED_LANGUAGES,
  getLanguagesForCountry,
  LanguageInfo
} from "@/lib/countryLanguageData";
import { CountryFlag } from "@/components/common/CountryFlag";
import { Languages, X, Check, Search, Globe } from "lucide-react";

interface LanguageSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LanguageSelectorModal: React.FC<LanguageSelectorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { locale, setLocale } = useI18n();
  const { country } = useCountry();

  const [activeTab, setActiveTab] = useState<"country" | "all">("country");
  const [search, setSearch] = useState("");

  // Reset search and tab on modal open
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setActiveTab("country");
    }
  }, [isOpen]);

  // Native languages for the currently selected country
  const countryNativeLanguages = useMemo(() => {
    return getLanguagesForCountry(country.code);
  }, [country.code]);

  // Filtered languages based on tab and search
  const displayedLanguages = useMemo(() => {
    const baseList =
      activeTab === "country" ? countryNativeLanguages : SUPPORTED_LANGUAGES;

    if (!search.trim()) {
      return baseList;
    }

    const q = search.toLowerCase().trim();
    return baseList.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
  }, [activeTab, countryNativeLanguages, search]);

  if (!isOpen) return null;

  const handleSelect = (code: string) => {
    setLocale(code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 relative max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
              <Languages className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#113D60] leading-tight">
                Select Language
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose your preferred marketplace language
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            aria-label="Close language selector modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Country Context Banner */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Selected Country:</span>
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CountryFlag code={country.code} size="sm" />
              <span>{country.name}</span>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-100/70 px-2 py-0.5 rounded-full">
            {countryNativeLanguages.length}{" "}
            {country.code === "IN" ? "Regional" : "Native"}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${country.name} languages or all...`}
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs: Country Native vs All Languages */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("country")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "country"
                ? "bg-white text-[#113D60] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CountryFlag code={country.code} size="sm" />
            <span className="truncate">
              {country.name} {country.code === "IN" ? "Regional" : "Native"} (
              {countryNativeLanguages.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-1.5 px-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "all"
                ? "bg-white text-[#113D60] shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-600" />
            <span>All Languages ({SUPPORTED_LANGUAGES.length})</span>
          </button>
        </div>

        {/* Scrollable Language List */}
        <div className="overflow-y-auto pr-1 shrink flex-1 max-h-[46vh] space-y-2">
          {displayedLanguages.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Languages className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-medium">No matching languages found</p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveTab("all");
                }}
                className="mt-2 text-xs font-bold text-cyan-600 hover:underline"
              >
                View all languages
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {displayedLanguages.map((lang) => {
                const isSelected = locale === lang.code;
                const flagCode =
                  lang.countryCode ||
                  (country.code === "IN" && lang.code !== "en"
                    ? "IN"
                    : country.code);

                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelect(lang.code)}
                    className={`p-3 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer group ${
                      isSelected
                        ? "border-cyan-600 bg-cyan-50/70 text-[#113D60] font-bold ring-1 ring-cyan-600 shadow-xs"
                        : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CountryFlag
                        code={flagCode}
                        size="sm"
                        className="shrink-0 group-hover:scale-105 transition-transform"
                      />
                      <div className="truncate">
                        <span className="text-sm font-bold block leading-tight text-slate-900 truncate">
                          {lang.nativeName}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium block truncate">
                          {lang.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0 ml-1 shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pinned Modal Footer */}
        <div className="pt-2 border-t border-slate-100 text-center shrink-0">
          <p className="text-[11px] text-slate-400">
            Selected language is remembered across your browsing sessions.
          </p>
        </div>
      </div>
    </div>
  );
};
