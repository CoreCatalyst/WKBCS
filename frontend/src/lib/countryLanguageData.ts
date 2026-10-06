export interface CountryInfo {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  currency: {
    code: string;
    symbol: string;
    name: string;
    rateFromINR: number; // For indicative currency conversion
  };
  phoneCode: string;
  addressSchema: {
    stateLabel: string;
    hasDistrict: boolean;
    postalLabel: string;
    postalPlaceholder: string;
  };
  defaultPaymentMethods: string[];
  isPopular?: boolean;
  languages: string[]; // Language codes native/official to this country
}

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  {
    code: "IN",
    name: "India",
    nativeName: "भारत",
    flag: "🇮🇳",
    currency: { code: "INR", symbol: "₹", name: "Indian Rupee", rateFromINR: 1.0 },
    phoneCode: "+91",
    addressSchema: {
      stateLabel: "State",
      hasDistrict: true,
      postalLabel: "PIN Code",
      postalPlaceholder: "e.g. 560100"
    },
    defaultPaymentMethods: ["UPI", "CARD", "NET_BANKING", "WALLETS", "EMI", "COD"],
    isPopular: true,
    languages: ["en", "hi", "ur", "mr", "bn", "ta", "te", "gu", "kn", "ml", "pa"]
  },
  {
    code: "US",
    name: "United States",
    nativeName: "United States",
    flag: "🇺🇸",
    currency: { code: "USD", symbol: "$", name: "US Dollar", rateFromINR: 0.0118 },
    phoneCode: "+1",
    addressSchema: {
      stateLabel: "State",
      hasDistrict: false,
      postalLabel: "ZIP Code",
      postalPlaceholder: "e.g. 94016"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["en", "es"]
  },
  {
    code: "GB",
    name: "United Kingdom",
    nativeName: "United Kingdom",
    flag: "🇬🇧",
    currency: { code: "GBP", symbol: "£", name: "British Pound", rateFromINR: 0.0091 },
    phoneCode: "+44",
    addressSchema: {
      stateLabel: "County / Region",
      hasDistrict: false,
      postalLabel: "Postcode",
      postalPlaceholder: "e.g. SW1A 1AA"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["en"]
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    nativeName: "الإمارات",
    flag: "🇦🇪",
    currency: { code: "AED", symbol: "AED", name: "UAE Dirham", rateFromINR: 0.0433 },
    phoneCode: "+971",
    addressSchema: {
      stateLabel: "Emirate",
      hasDistrict: false,
      postalLabel: "PO Box / Postal Code",
      postalPlaceholder: "e.g. 12345"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["ar", "en"]
  },
  {
    code: "SG",
    name: "Singapore",
    nativeName: "Singapore",
    flag: "🇸🇬",
    currency: { code: "SGD", symbol: "S$", name: "Singapore Dollar", rateFromINR: 0.0159 },
    phoneCode: "+65",
    addressSchema: {
      stateLabel: "Region",
      hasDistrict: false,
      postalLabel: "Postal Code",
      postalPlaceholder: "e.g. 018989"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["en", "zh", "ms", "ta"]
  },
  {
    code: "AU",
    name: "Australia",
    nativeName: "Australia",
    flag: "🇦🇺",
    currency: { code: "AUD", symbol: "A$", name: "Australian Dollar", rateFromINR: 0.0182 },
    phoneCode: "+61",
    addressSchema: {
      stateLabel: "State / Territory",
      hasDistrict: false,
      postalLabel: "Postcode",
      postalPlaceholder: "e.g. 2000"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["en"]
  },
  {
    code: "CA",
    name: "Canada",
    nativeName: "Canada",
    flag: "🇨🇦",
    currency: { code: "CAD", symbol: "C$", name: "Canadian Dollar", rateFromINR: 0.0161 },
    phoneCode: "+1",
    addressSchema: {
      stateLabel: "Province",
      hasDistrict: false,
      postalLabel: "Postal Code",
      postalPlaceholder: "e.g. M5V 2T6"
    },
    defaultPaymentMethods: ["CARD", "WALLETS", "NET_BANKING"],
    isPopular: true,
    languages: ["en", "fr"]
  },
  {
    code: "DE",
    name: "Germany",
    nativeName: "Deutschland",
    flag: "🇩🇪",
    currency: { code: "EUR", symbol: "€", name: "Euro", rateFromINR: 0.0108 },
    phoneCode: "+49",
    addressSchema: {
      stateLabel: "Bundesland",
      hasDistrict: false,
      postalLabel: "Postleitzahl",
      postalPlaceholder: "e.g. 10115"
    },
    defaultPaymentMethods: ["CARD", "NET_BANKING"],
    isPopular: false,
    languages: ["de", "en"]
  },
  {
    code: "JP",
    name: "Japan",
    nativeName: "日本",
    flag: "🇯🇵",
    currency: { code: "JPY", symbol: "¥", name: "Japanese Yen", rateFromINR: 1.77 },
    phoneCode: "+81",
    addressSchema: {
      stateLabel: "Prefecture",
      hasDistrict: false,
      postalLabel: "Postal Code",
      postalPlaceholder: "e.g. 100-0001"
    },
    defaultPaymentMethods: ["CARD"],
    isPopular: false,
    languages: ["ja", "en"]
  }
];

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  countryCode?: string;
}

// Canonical supported languages: Indian Regional + International
export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  // India Regional Languages (All regional languages shown when India is selected)
  { code: "en", name: "English", nativeName: "English", countryCode: "GB" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", countryCode: "IN" },
  { code: "ur", name: "Urdu", nativeName: "اردو", countryCode: "IN" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", countryCode: "IN" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", countryCode: "IN" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", countryCode: "IN" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", countryCode: "IN" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", countryCode: "IN" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", countryCode: "IN" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", countryCode: "IN" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", countryCode: "IN" },

  // International Native Languages for Supported Countries
  { code: "ar", name: "Arabic", nativeName: "العربية", countryCode: "AE" },
  { code: "de", name: "German", nativeName: "Deutsch", countryCode: "DE" },
  { code: "ja", name: "Japanese", nativeName: "日本語", countryCode: "JP" },
  { code: "fr", name: "French", nativeName: "Français", countryCode: "CA" },
  { code: "es", name: "Spanish", nativeName: "Español", countryCode: "US" },
  { code: "zh", name: "Chinese", nativeName: "简体中文", countryCode: "SG" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", countryCode: "SG" }
];

/**
 * Returns native/official languages for a given country code.
 * Defaults to all supported languages if country has no specific mapping.
 */
export const getLanguagesForCountry = (countryCode: string): LanguageInfo[] => {
  const foundCountry = SUPPORTED_COUNTRIES.find((c) => c.code === countryCode);
  if (!foundCountry || !foundCountry.languages || foundCountry.languages.length === 0) {
    return SUPPORTED_LANGUAGES;
  }
  return foundCountry.languages
    .map((code) => SUPPORTED_LANGUAGES.find((l) => l.code === code))
    .filter((l): l is LanguageInfo => Boolean(l));
};
