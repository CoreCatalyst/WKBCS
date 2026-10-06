"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMarketplace } from "@/contexts/MarketplaceContext";
import { useCountry } from "@/contexts/CountryContext";
import { usePaymentGateway } from "@/contexts/PaymentGatewayContext";
import {
  ShieldCheck,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lock,
  AlertCircle,
  Percent,
  Info,
  Layers,
  ArrowLeft,
  Truck,
  QrCode,
  Smartphone,
  Landmark,
  Wallet,
  Clock,
  Search,
  Check,
  RotateCcw,
  Coins,
  Sparkles
} from "lucide-react";

const POPULAR_BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India (SBI)",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank (PNB)"
];

const ALL_BANKS = [
  "HDFC Bank",
  "ICICI Bank",
  "State Bank of India (SBI)",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank (PNB)",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Federal Bank",
  "Yes Bank"
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { listings, createTransaction } = useMarketplace();
  const { country, formatPrice } = useCountry();
  const {
    activeGateway,
    businessPaymentSettings,
    processPayment
  } = usePaymentGateway();

  const productId = searchParams.get("productId") || "item-1";
  const quantity = Math.max(1, parseInt(searchParams.get("quantity") || "1"));

  const targetListing = listings.find((l) => l.id === productId) || listings[0];
  const unitPrice = targetListing?.price || 10000;

  // IMPORTANT RULE (Section 22):
  // Customer Total is ONLY Product Price * quantity (+ any customer-side charges).
  // Noryvanta business platform fee is NOT added to customer checkout.
  const customerTotal = unitPrice * quantity;

  // Choosable Reward Units Facility (Section 8 Invariant & User Requirement 3)
  const [availableRewardUnits] = useState(2500); // Available repurchase reward units in account
  const [applyRewards, setApplyRewards] = useState(false);
  const [selectedRewardUnits, setSelectedRewardUnits] = useState(0);

  // Maximum usable units cannot exceed available units or customer total
  const maxUsableUnits = Math.min(availableRewardUnits, customerTotal);
  const actualAppliedUnits = applyRewards ? Math.min(selectedRewardUnits, maxUsableUnits) : 0;
  const finalPayableTotal = Math.max(0, customerTotal - actualAppliedUnits);

  // Selected payment method
  const [selectedMethod, setSelectedMethod] = useState<string>("UPI");

  // UPI sub-options
  const [upiSubOption, setUpiSubOption] = useState<"ID" | "APP" | "QR">("ID");
  const [upiId, setUpiId] = useState("");

  // Card details
  const [cardDetails, setCardDetails] = useState({
    cardNumber: "4532 •••• •••• 8842",
    expiry: "09/28",
    cvv: "•••",
    name: "Rajesh Kumar"
  });

  // Net banking details
  const [selectedBank, setSelectedBank] = useState("HDFC Bank");
  const [bankSearch, setBankSearch] = useState("");

  // Customer Contact & Dynamic Address Fields based on Country (Section 20)
  const [customerName, setCustomerName] = useState("Industrial Procurement Ltd.");
  const [customerEmail, setCustomerEmail] = useState("procurement@enterprise.in");
  const [customerPhone, setCustomerPhone] = useState(country.phoneCode === "+91" ? "98450 12345" : "555 123 4567");

  const [addressData, setAddressData] = useState({
    street: "Plot 42, Electronic City Phase 1",
    city: "Bengaluru",
    stateOrProvince: "Karnataka",
    district: "Bengaluru Urban",
    postalCode: "560100"
  });

  // Transaction processing & states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    status: "IDLE" | "SUCCESS" | "FAILED";
    orderId?: string;
    amount?: number;
    method?: string;
    businessName?: string;
    errorMessage?: string;
  }>({ status: "IDLE" });

  // Eligibility check for Cash on Delivery (Section 9)
  const isCodEligible =
    country.code === "IN" &&
    targetListing.type === "Product" && // Products only, not services
    businessPaymentSettings.codEnabled &&
    businessPaymentSettings.enabledMethods.cod;

  // Available payment methods for this country & business settings (Section 5, 10, 19)
  const availableMethods = [
    ...(country.code === "IN" && businessPaymentSettings.enabledMethods.upi
      ? [{ id: "UPI", label: "UPI (Google Pay, PhonePe, Paytm, QR)", icon: Smartphone }]
      : []),
    ...(businessPaymentSettings.enabledMethods.card
      ? [{ id: "CARD", label: "Credit / Debit Card", icon: CreditCard }]
      : []),
    ...(businessPaymentSettings.enabledMethods.netbanking
      ? [{ id: "NET_BANKING", label: "Net Banking", icon: Landmark }]
      : []),
    ...(businessPaymentSettings.enabledMethods.wallets
      ? [{ id: "WALLETS", label: "Wallets (Paytm, Amazon Pay)", icon: Wallet }]
      : []),
    ...(country.code === "IN" && businessPaymentSettings.enabledMethods.emi
      ? [{ id: "EMI", label: "EMI / Pay Later", icon: Clock }]
      : []),
    ...(isCodEligible
      ? [{ id: "COD", label: "Cash on Delivery (COD)", icon: Truck }]
      : [])
  ];

  const handleProcessOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const generatedOrderId = `NRY-${Math.floor(100000 + Math.random() * 900000)}`;

    try {
      const res = await processPayment({
        orderId: generatedOrderId,
        amount: finalPayableTotal,
        currency: country.currency.code,
        method: selectedMethod,
        customerEmail,
        customerPhone: `${country.phoneCode} ${customerPhone}`,
        cardDetails: selectedMethod === "CARD" ? cardDetails : undefined,
        upiId: selectedMethod === "UPI" ? upiId : undefined,
        bankName: selectedMethod === "NET_BANKING" ? selectedBank : undefined
      });

      setIsProcessing(false);

      if (res.success) {
        // Create business-side transaction record with category platform fee calculation
        createTransaction({
          orderId: generatedOrderId,
          customerName,
          listingId: targetListing.id,
          grossAmount: customerTotal,
          paymentMethod: selectedMethod
        });

        setPaymentResult({
          status: "SUCCESS",
          orderId: generatedOrderId,
          amount: finalPayableTotal,
          method: selectedMethod,
          businessName: targetListing.businessName
        });
      } else {
        setPaymentResult({
          status: "FAILED",
          orderId: generatedOrderId,
          errorMessage: res.failureReason || "Payment declined by issuing bank or gateway timeout."
        });
      }
    } catch (err: any) {
      setIsProcessing(false);
      setPaymentResult({
        status: "FAILED",
        orderId: generatedOrderId,
        errorMessage: "Network gateway communication error. Please try again."
      });
    }
  };

  // ─── 14. CUSTOMER PAYMENT CONFIRMATION SCREEN ─────────────────────────────
  // (CRITICAL RULE: DO NOT SHOW NORYVANTA BUSINESS PLATFORM FEE TO CUSTOMER)
  if (paymentResult.status === "SUCCESS") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#113D60] tracking-tight">
              ✓ Payment Successful
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Your order has been confirmed and placed with the merchant.
            </p>
          </div>

          {/* Exact Customer Details from Section 14:
              Order ID, Amount Paid, Payment Method, Business, Order Status.
              DO NOT show business platform fee! */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Order ID:</span>
              <span className="font-mono font-bold text-[#113D60]">{paymentResult.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount Paid:</span>
              <span className="font-bold text-[#113D60] text-sm">
                {formatPrice(paymentResult.amount || finalPayableTotal)}
              </span>
            </div>
            {actualAppliedUnits > 0 && (
              <div className="flex justify-between text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/80">
                <span className="flex items-center gap-1 font-semibold">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>Reward Units Redeemed:</span>
                </span>
                <span className="font-bold">-{formatPrice(actualAppliedUnits)} ({actualAppliedUnits.toLocaleString()} pts)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method:</span>
              <span className="font-semibold text-slate-700">{paymentResult.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Business:</span>
              <span className="font-semibold text-cyan-800">{paymentResult.businessName}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200">
              <span className="text-slate-500">Order Status:</span>
              <span className="font-bold text-emerald-700 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Confirmed</span>
              </span>
            </div>
          </div>

          <div className="p-3 bg-cyan-50/70 border border-cyan-200/80 rounded-xl text-[11px] text-cyan-900 text-left flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
            <span>
              Your funds are held securely in escrow until verified dispatch and delivery inspection window.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Link
              href="/orders"
              className="flex-1 py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition text-center"
            >
              View Order
            </Link>
            <Link
              href="/products"
              className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── 15. CUSTOMER PAYMENT FAILURE SCREEN ──────────────────────────────────
  if (paymentResult.status === "FAILED") {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-red-200 shadow-2xl p-8 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 text-red-600 flex items-center justify-center mx-auto shadow-sm">
            <XCircle className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-[#113D60] tracking-tight">
              Payment could not be completed
            </h2>
            <p className="text-xs text-red-600 mt-2 font-medium">
              {paymentResult.errorMessage || "Your bank declined the transaction or the gateway timed out."}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-1 text-slate-600">
            <p className="font-bold text-slate-800 mb-1">Common reasons for payment failure:</p>
            <p>• Card limit reached or insufficient account balance</p>
            <p>• Bank authentication / OTP timeout</p>
            <p>• Incorrect CVV or card details entered</p>
            <p>• Gateway connectivity issue</p>
          </div>

          {/* Exact Buttons required by Section 15 */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => setPaymentResult({ status: "IDLE" })}
              className="w-full py-3 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition"
            >
              Try Again
            </button>
            <button
              onClick={() => setPaymentResult({ status: "IDLE" })}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium rounded-xl transition"
            >
              Choose Another Payment Method
            </button>
            <Link
              href="/products"
              className="block w-full py-2.5 text-slate-500 hover:text-slate-800 text-xs font-medium text-center"
            >
              Back to Checkout
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filtered banks for net banking search
  const filteredBanks = ALL_BANKS.filter((b) =>
    b.toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href={`/products/${targetListing.id}`}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#113D60]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Listing</span>
          </Link>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-xs">
            <span>{country.flag}</span>
            <span>Market: {country.name}</span>
            <span className="text-slate-300">•</span>
            <span className="text-cyan-700">{country.currency.code} ({country.currency.symbol})</span>
          </div>
        </div>

        <div>
          {/* Exact Title from Section 10 */}
          <h1 className="text-2xl sm:text-3xl font-bold text-[#113D60] tracking-tight">
            Choose Payment Method
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Processed via verified institutional rails ({activeGateway.name}). Guaranteed escrow security.
          </p>
        </div>

        <form onSubmit={handleProcessOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Customer details & Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            {/* Delivery & Address Information (Section 20 Dynamic Schema) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h2 className="text-sm font-bold text-[#113D60]">Customer & Delivery Information</h2>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Name / Entity</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number ({country.phoneCode})
                  </label>
                  <div className="flex gap-2">
                    <span className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-600 font-bold">
                      {country.phoneCode}
                    </span>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Street Address</label>
                  <input
                    type="text"
                    required
                    value={addressData.street}
                    onChange={(e) => setAddressData({ ...addressData, street: e.target.value })}
                    className="w-full p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      required
                      value={addressData.city}
                      onChange={(e) => setAddressData({ ...addressData, city: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {country.addressSchema.stateLabel}
                    </label>
                    <input
                      type="text"
                      required
                      value={addressData.stateOrProvince}
                      onChange={(e) => setAddressData({ ...addressData, stateOrProvince: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {country.addressSchema.postalLabel}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={country.addressSchema.postalPlaceholder}
                      value={addressData.postalCode}
                      onChange={(e) => setAddressData({ ...addressData, postalCode: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector (Section 10) */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#113D60]">Select Payment Rail</h2>
                <span className="text-[10px] text-slate-400 font-semibold uppercase">
                  Powered by {activeGateway.name}
                </span>
              </div>

              {/* Radios for methods */}
              <div className="space-y-2">
                {availableMethods.map((m) => {
                  const Icon = m.icon;
                  const isSelected = selectedMethod === m.id;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition ${
                        isSelected
                          ? "border-[#113D60] bg-slate-50 text-[#113D60] ring-1 ring-[#113D60]"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="payment_method"
                          value={m.id}
                          checked={isSelected}
                          onChange={() => setSelectedMethod(m.id)}
                          className="text-[#113D60] focus:ring-[#113D60]"
                        />
                        <Icon className={`w-4 h-4 ${isSelected ? "text-cyan-600" : "text-slate-400"}`} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* ─── 7. UPI PAYMENT UI (Section 7) ─────────────────────────────── */}
              {selectedMethod === "UPI" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setUpiSubOption("ID")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        upiSubOption === "ID" ? "bg-[#113D60] text-white" : "text-slate-600"
                      }`}
                    >
                      Enter UPI ID
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiSubOption("APP")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        upiSubOption === "APP" ? "bg-[#113D60] text-white" : "text-slate-600"
                      }`}
                    >
                      Pay via App
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpiSubOption("QR")}
                      className={`flex-1 py-1.5 rounded-lg transition ${
                        upiSubOption === "QR" ? "bg-[#113D60] text-white" : "text-slate-600"
                      }`}
                    >
                      Scan QR
                    </button>
                  </div>

                  {upiSubOption === "ID" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700">UPI ID / VPA</label>
                      <input
                        type="text"
                        placeholder="example@upi (or mobilenumber@okaxis)"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white"
                      />
                      <p className="text-[10px] text-slate-400">
                        A payment authorization request will be sent to your UPI application.
                      </p>
                    </div>
                  )}

                  {upiSubOption === "APP" && (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {["Google Pay", "PhonePe", "Paytm", "BHIM UPI"].map((app) => (
                        <div key={app} className="p-3 bg-white rounded-xl border border-slate-200 font-bold hover:border-cyan-500 cursor-pointer">
                          {app}
                        </div>
                      ))}
                    </div>
                  )}

                  {upiSubOption === "QR" && (
                    <div className="text-center p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="w-32 h-32 mx-auto bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                        <QrCode className="w-24 h-24 text-slate-800" />
                      </div>
                      <p className="text-[11px] font-bold text-slate-700">Scan using any UPI App</p>
                      <p className="text-[10px] text-slate-400">Dynamic QR securely tied to Order Escrow</p>
                    </div>
                  )}
                </div>
              )}

              {/* ─── 6. CARD PAYMENT UI (Section 6) ────────────────────────────── */}
              {selectedMethod === "CARD" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardDetails.cardNumber}
                      onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                      placeholder="•••• •••• •••• ••••"
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Expiry (MM / YY)</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                        placeholder="MM/YY"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">CVV</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardDetails.cvv}
                        onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                        placeholder="•••"
                        className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-center font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardDetails.name}
                      onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                      placeholder="Name printed on card"
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-white"
                    />
                  </div>

                  {/* Exact Security Notice from Section 6 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>&ldquo;Your payment information is securely processed by our payment partner.&rdquo;</span>
                  </div>
                </div>
              )}

              {/* ─── 8. NET BANKING (Section 8) ─────────────────────────────────── */}
              {selectedMethod === "NET_BANKING" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Popular Banks</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {POPULAR_BANKS.map((bank) => (
                        <button
                          key={bank}
                          type="button"
                          onClick={() => setSelectedBank(bank)}
                          className={`p-2 rounded-xl border text-left font-bold text-[11px] transition ${
                            selectedBank === bank
                              ? "bg-white border-[#113D60] text-[#113D60] shadow-xs"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block font-semibold text-slate-700 mb-1">Search All Other Banks</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search your bank name..."
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-white text-xs"
                      />
                    </div>
                    {bankSearch && (
                      <div className="mt-1 max-h-32 overflow-y-auto border border-slate-200 rounded-xl bg-white divide-y divide-slate-100">
                        {filteredBanks.map((b) => (
                          <div
                            key={b}
                            onClick={() => {
                              setSelectedBank(b);
                              setBankSearch("");
                            }}
                            className="p-2 hover:bg-slate-50 cursor-pointer font-semibold text-slate-700"
                          >
                            {b}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── 9. CASH ON DELIVERY (Section 9) ───────────────────────────── */}
              {selectedMethod === "COD" && (
                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2 text-xs text-amber-900">
                  <p className="font-bold flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-amber-700" />
                    <span>Cash on Delivery Confirmed</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800">
                    Pay the total amount in cash or dynamic UPI QR to the delivery personnel upon receipt of your physical package.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Total Payable (Section 22 Rule) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-5 shadow-lifted">
              <h2 className="text-sm font-bold text-[#113D60] border-b border-slate-100 pb-3">
                Order Summary
              </h2>

              {/* Item Card */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <img
                  src={targetListing.images[0]}
                  alt={targetListing.title}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="overflow-hidden text-xs">
                  <h4 className="font-bold text-[#113D60] truncate">{targetListing.title}</h4>
                  <p className="text-slate-500 mt-0.5">
                    Qty: {quantity} • {formatPrice(unitPrice)} each
                  </p>
                  <p className="text-[10px] text-cyan-700 font-semibold">{targetListing.businessName}</p>
                </div>
              </div>

              {/* ─── Choosable Reward Units Facility (Section 8 Invariant & User Request 3) ─── */}
              <div className="p-4 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-2xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span>Noryvanta Reward Units</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Repurchase Only</span>
                      </h4>
                      <p className="text-[10px] text-amber-700 font-medium">
                        Available Balance: <strong>{availableRewardUnits.toLocaleString()} Units</strong>
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyRewards}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setApplyRewards(checked);
                        if (checked && selectedRewardUnits === 0) {
                          setSelectedRewardUnits(maxUsableUnits);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {applyRewards && (
                  <div className="space-y-3 pt-2 border-t border-amber-200/70 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Choose Units to Redeem:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={maxUsableUnits}
                          value={selectedRewardUnits}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setSelectedRewardUnits(Math.min(Math.max(0, val), maxUsableUnits));
                          }}
                          className="w-24 text-right px-2 py-1 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                        />
                        <span className="text-[11px] text-slate-500 font-semibold">Units</span>
                      </div>
                    </div>

                    {/* Quick Percentage Chips */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 font-medium">Quick:</span>
                      {[
                        { label: "25%", ratio: 0.25 },
                        { label: "50%", ratio: 0.5 },
                        { label: "75%", ratio: 0.75 },
                        { label: "Max Units", ratio: 1.0 }
                      ].map((chip) => {
                        const targetVal = Math.floor(maxUsableUnits * chip.ratio);
                        const isSelected = selectedRewardUnits === targetVal;
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setSelectedRewardUnits(targetVal)}
                            className={`text-[10px] px-2 py-1 rounded-lg font-semibold border transition ${
                              isSelected
                                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-amber-300"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Range slider for smooth selection */}
                    <div className="pt-1">
                      <input
                        type="range"
                        min={0}
                        max={maxUsableUnits}
                        step={10}
                        value={selectedRewardUnits}
                        onChange={(e) => setSelectedRewardUnits(parseInt(e.target.value) || 0)}
                        className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                        <span>0</span>
                        <span className="font-bold text-amber-700">Offset: -{formatPrice(actualAppliedUnits)}</span>
                        <span>{maxUsableUnits.toLocaleString()} max</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200/80 text-[10px] text-amber-900 leading-tight flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Repurchase Exclusivity:</strong> Reward units redeem solely to offset orders. Strictly non-cash and non-withdrawable per Section 8 Noryvanta T&amp;C.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* EXACT CUSTOMER PRICING BREAKDOWN (Section 22):
                  Product Price + Customer charges = Customer Total.
                  Noryvanta business platform fee is NOT added to customer checkout! */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Product Price ({quantity}x)</span>
                  <span className="font-semibold text-slate-900">{formatPrice(customerTotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <span>Standard Shipping & Logistics</span>
                  <span className="font-semibold text-emerald-700">Free</span>
                </div>

                {applyRewards && actualAppliedUnits > 0 && (
                  <div className="flex justify-between text-amber-700 font-semibold bg-amber-50/80 p-2.5 rounded-xl border border-amber-200">
                    <span className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-600" />
                      <span>Reward Units Applied ({actualAppliedUnits.toLocaleString()} pts)</span>
                    </span>
                    <span>-{formatPrice(actualAppliedUnits)}</span>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-[#113D60]">Total Payable Amount</span>
                  <span className="text-2xl font-semibold text-[#113D60]">
                    {formatPrice(finalPayableTotal)}
                  </span>
                </div>
              </div>

              {/* Exact CTA Buttons from Section 10 */}
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3.5 bg-[#113D60] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition shadow-ambient flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>
                  {isProcessing
                    ? "Securing with Gateway..."
                    : selectedMethod === "COD"
                    ? "Place Order (Cash on Delivery)"
                    : `Continue to Payment (${formatPrice(finalPayableTotal)})`}
                </span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% Escrow Protection • RBI-Regulated Partner</span>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Checkout...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
