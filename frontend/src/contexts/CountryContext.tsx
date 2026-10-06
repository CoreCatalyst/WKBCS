"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CountryInfo, SUPPORTED_COUNTRIES } from "@/lib/countryLanguageData";

interface CountryContextType {
  country: CountryInfo;
  setCountryByCode: (code: string) => void;
  formatPrice: (amountInINR: number) => string;
  currencyCode: string;
  currencySymbol: string;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const CountryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [country, setCountry] = useState<CountryInfo>(SUPPORTED_COUNTRIES[0]); // Default India

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCode = localStorage.getItem("noryvanta_country_code");
      if (savedCode) {
        const found = SUPPORTED_COUNTRIES.find((c) => c.code === savedCode);
        if (found) setCountry(found);
      }
    }
  }, []);

  const setCountryByCode = (code: string) => {
    const found = SUPPORTED_COUNTRIES.find((c) => c.code === code);
    if (found) {
      setCountry(found);
      if (typeof window !== "undefined") {
        localStorage.setItem("noryvanta_country_code", code);
      }
    }
  };

  const formatPrice = (amountInINR: number): string => {
    if (country.code === "IN" || country.currency.code === "INR") {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(amountInINR);
    }

    // Indicative converted price
    const converted = amountInINR * country.currency.rateFromINR;
    return new Intl.NumberFormat(country.code === "US" ? "en-US" : "en-GB", {
      style: "currency",
      currency: country.currency.code,
      maximumFractionDigits: converted < 50 ? 2 : 0
    }).format(converted);
  };

  return (
    <CountryContext.Provider
      value={{
        country,
        setCountryByCode,
        formatPrice,
        currencyCode: country.currency.code,
        currencySymbol: country.currency.symbol
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error("useCountry must be used within a CountryProvider");
  }
  return context;
};
