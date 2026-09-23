"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

type Locale = "en" | "hi";

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (keyPath: string) => string;
}

const dictionaries: Record<Locale, any> = { en, hi };

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (keyPath: string) => keyPath,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("noryvanta_locale") as Locale;
    if (saved && (saved === "en" || saved === "hi")) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLoc: Locale) => {
    setLocaleState(newLoc);
    localStorage.setItem("noryvanta_locale", newLoc);
  };

  const t = (keyPath: string): string => {
    const keys = keyPath.split(".");
    let current: any = dictionaries[locale] || dictionaries["en"];
    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        return keyPath;
      }
    }
    return typeof current === "string" ? current : keyPath;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
