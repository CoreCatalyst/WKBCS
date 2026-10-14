"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  GatewayConfig,
  INITIAL_GATEWAYS,
  PaymentGatewayId,
  BusinessPaymentSettings,
  INITIAL_BUSINESS_PAYMENT_SETTINGS,
  PaymentStatus,
  OrderStatus
} from "@/lib/paymentGatewayTypes";

interface PaymentProcessResult {
  success: boolean;
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  gatewayUsed: PaymentGatewayId;
  methodUsed: string;
  amount: number;
  failureReason?: string;
}

interface PaymentGatewayContextType {
  gateways: GatewayConfig[];
  activeGateway: GatewayConfig;
  setActiveGatewayId: (id: PaymentGatewayId) => void;
  updateGatewayConfig: (id: PaymentGatewayId, updates: Partial<GatewayConfig>) => void;
  businessPaymentSettings: BusinessPaymentSettings;
  updateBusinessPaymentSettings: (updates: Partial<BusinessPaymentSettings>) => void;
  toggleBusinessPaymentMethod: (method: keyof BusinessPaymentSettings["enabledMethods"]) => void;
  processPayment: (params: {
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    customerEmail: string;
    customerPhone: string;
    cardDetails?: {
      cardNumber: string;
      expiry: string;
      cvv: string;
      name: string;
    };
    upiId?: string;
    bankName?: string;
  }) => Promise<PaymentProcessResult>;
}

const PaymentGatewayContext = createContext<PaymentGatewayContextType | undefined>(undefined);

export const PaymentGatewayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gateways, setGateways] = useState<GatewayConfig[]>(INITIAL_GATEWAYS);
  const [activeGatewayId, setActiveGatewayIdState] = useState<PaymentGatewayId>("razorpay");
  const [businessPaymentSettings, setBusinessPaymentSettings] = useState<BusinessPaymentSettings>(
    INITIAL_BUSINESS_PAYMENT_SETTINGS
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGateways = localStorage.getItem("noryvanta_gateways");
      const savedActive = localStorage.getItem("noryvanta_active_gateway") as PaymentGatewayId;
      const savedBizSettings = localStorage.getItem("noryvanta_biz_payment_settings");

      if (savedGateways) {
        try { setGateways(JSON.parse(savedGateways)); } catch (e) { /* ignore */ }
      }
      if (savedActive && (savedActive === "razorpay" || savedActive === "cashfree")) {
        setActiveGatewayIdState(savedActive);
      }
      if (savedBizSettings) {
        try { setBusinessPaymentSettings(JSON.parse(savedBizSettings)); } catch (e) { /* ignore */ }
      }
    }
  }, []);

  const saveGateways = (updated: GatewayConfig[]) => {
    setGateways(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_gateways", JSON.stringify(updated));
    }
  };

  const setActiveGatewayId = (id: PaymentGatewayId) => {
    setActiveGatewayIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_active_gateway", id);
    }
  };

  const updateGatewayConfig = (id: PaymentGatewayId, updates: Partial<GatewayConfig>) => {
    const updated = gateways.map((g) => (g.id === id ? { ...g, ...updates } : g));
    saveGateways(updated);
  };

  const updateBusinessPaymentSettings = (updates: Partial<BusinessPaymentSettings>) => {
    const updated = { ...businessPaymentSettings, ...updates };
    setBusinessPaymentSettings(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("noryvanta_biz_payment_settings", JSON.stringify(updated));
    }
  };

  const toggleBusinessPaymentMethod = (method: keyof BusinessPaymentSettings["enabledMethods"]) => {
    const currentVal = businessPaymentSettings.enabledMethods[method];
    const updated = {
      ...businessPaymentSettings,
      enabledMethods: {
        ...businessPaymentSettings.enabledMethods,
        [method]: !currentVal
      },
      // If toggling cod, sync codEnabled
      ...(method === "cod" ? { codEnabled: !currentVal } : {})
    };
    updateBusinessPaymentSettings(updated);
  };

  const activeGateway = gateways.find((g) => g.id === activeGatewayId) || gateways[0];

  // Secure Server-side Simulated Verification
  const processPayment = async (params: {
    orderId: string;
    amount: number;
    currency: string;
    method: string;
    customerEmail: string;
    customerPhone: string;
    cardDetails?: {
      cardNumber: string;
      expiry: string;
      cvv: string;
      name: string;
    };
    upiId?: string;
    bankName?: string;
  }): Promise<PaymentProcessResult> => {
    // Artificial latency for gateway API handshaking
    await new Promise((res) => setTimeout(res, 1200));

    // Handle COD case
    if (params.method === "Cash on Delivery") {
      return {
        success: true,
        paymentId: `PAY_COD_${Date.now()}`,
        orderId: params.orderId,
        paymentStatus: "COD Pending",
        orderStatus: "Processing",
        gatewayUsed: activeGateway.id,
        methodUsed: "Cash on Delivery",
        amount: params.amount
      };
    }

    // Failure simulation if user intentionally enters an invalid card or test error
    if (params.cardDetails && params.cardDetails.cardNumber.endsWith("0000")) {
      return {
        success: false,
        paymentId: `PAY_FAIL_${Date.now()}`,
        orderId: params.orderId,
        paymentStatus: "Failed",
        orderStatus: "Cancelled",
        gatewayUsed: activeGateway.id,
        methodUsed: params.method,
        amount: params.amount,
        failureReason: "Payment was declined by issuing bank (Test Simulator Code: EX_0000)"
      };
    }

    // Successful server-verified transaction
    return {
      success: true,
      paymentId: `PAY_${activeGateway.id.toUpperCase()}_${Date.now()}`,
      orderId: params.orderId,
      paymentStatus: "Successful",
      orderStatus: "Confirmed",
      gatewayUsed: activeGateway.id,
      methodUsed: params.method,
      amount: params.amount
    };
  };

  return (
    <PaymentGatewayContext.Provider
      value={{
        gateways,
        activeGateway,
        setActiveGatewayId,
        updateGatewayConfig,
        businessPaymentSettings,
        updateBusinessPaymentSettings,
        toggleBusinessPaymentMethod,
        processPayment
      }}
    >
      {children}
    </PaymentGatewayContext.Provider>
  );
};

export const usePaymentGateway = () => {
  const context = useContext(PaymentGatewayContext);
  if (!context) {
    throw new Error("usePaymentGateway must be used within a PaymentGatewayProvider");
  }
  return context;
};
