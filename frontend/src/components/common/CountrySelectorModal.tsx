"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useCountry } from "@/contexts/CountryContext";
import { SUPPORTED_COUNTRIES } from "@/lib/countryLanguageData";
import { CountryFlag } from "@/components/common/CountryFlag";
import { Search, X, Check, Globe } from "lucide-react";

interface CountrySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_COUNTRIES = SUPPORTED_COUNTRIES.filter((c) => c.isPopular);
const OTHER_COUNTRIES = SUPPORTED_COUNTRIES.filter((c) => !c.isPopular);

export const CountrySelectorModal: React.FC<CountrySelectorModalProps> = ({ isOpen, onClose }) => {
  const { country, setCountryByCode } = useCountry();
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "popular" | "other">("all");

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setFilterTab("all");
    }
  }, [isOpen]);

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase().trim();
    return SUPPORTED_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.nativeName.toLowerCase().includes(q) ||
        c.currency.code.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phoneCode.includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  const popularCountries = POPULAR_COUNTRIES;
  const otherCountries = OTHER_COUNTRIES;

  const handleSelect = (code: string) => {
    setCountryByCode(code);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 relative max-h-[90vh] flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#113D60] tracking-tight">
                Select Country &amp; Market
              </h3>
              <p className="text-[11px] text-slate-500">
                Choose your local region for currency, taxes, and shipping
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative shrink-0">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country, currency, or dial code..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills when not actively searching */}
        {!search && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                filterTab === "all"
                  ? "bg-[#113D60] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              All Countries ({SUPPORTED_COUNTRIES.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("popular")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                filterTab === "popular"
                  ? "bg-[#113D60] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              Popular ({popularCountries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("other")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                filterTab === "other"
                  ? "bg-[#113D60] text-white shadow-xs"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              Other ({otherCountries.length})
            </button>
          </div>
        )}

        {/* Scrollable Countries List - No Duplicates Ever */}
        <div className="overflow-y-auto pr-1 space-y-3.5 shrink flex-1 max-h-72">
          {search ? (
            searchFiltered && searchFiltered.length > 0 ? (
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Search Results ({searchFiltered.length})
                </span>
                {searchFiltered.map((c) => {
                  const isSelected = country.code === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleSelect(c.code)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition ${
                        isSelected
                          ? "border-[#113D60] bg-slate-50/90 text-[#113D60] font-bold shadow-xs ring-1 ring-[#113D60]"
                          : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag code={c.code} size="md" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold">{c.name}</span>
                            {c.isPopular && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200">
                                Popular
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {c.nativeName} • {c.currency.code} ({c.currency.symbol}) • {c.phoneCode}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#113D60] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-600">No countries match &quot;{search}&quot;</p>
                <p>Try searching by currency code (e.g. INR, USD) or dial code (+91, +1)</p>
              </div>
            )
          ) : (
            // Non-search view: Displays based on filter tab, with ZERO repetition!
            <div className="space-y-4">
              {/* Popular Markets Section */}
              {(filterTab === "all" || filterTab === "popular") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Popular Markets
                    </span>
                    <span className="text-[11px] text-cyan-700 font-medium">
                      {popularCountries.length} Regions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {popularCountries.map((c) => {
                      const isSelected = country.code === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelect(c.code)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition ${
                            isSelected
                              ? "border-[#113D60] bg-slate-50 text-[#113D60] font-semibold ring-1 ring-[#113D60] shadow-xs"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CountryFlag code={c.code} size="md" />
                            <div className="truncate">
                              <span className="text-xs font-semibold block truncate">{c.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate font-mono">
                                {c.currency.code} ({c.currency.symbol})
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Other Markets Section - ONLY non-popular countries! NO DUPLICATES! */}
              {(filterTab === "all" || filterTab === "other") && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Other Supported Markets
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {otherCountries.length} Regions
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {otherCountries.map((c) => {
                      const isSelected = country.code === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => handleSelect(c.code)}
                          className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition ${
                            isSelected
                              ? "border-[#113D60] bg-slate-50 text-[#113D60] font-bold ring-1 ring-[#113D60] shadow-xs"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CountryFlag code={c.code} size="md" />
                            <div className="truncate">
                              <span className="text-xs font-bold block truncate">{c.name}</span>
                              <span className="text-[10px] text-slate-400 block truncate font-mono">
                                {c.currency.code} ({c.currency.symbol})
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-4 h-4 text-cyan-600 shrink-0 ml-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 shrink-0">
          Changing country updates currency, address layout, and eligible payment rails automatically.
        </p>
      </div>
    </div>
  );
};
