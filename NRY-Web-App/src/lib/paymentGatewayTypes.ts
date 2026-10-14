export type PaymentGatewayId = "razorpay" | "cashfree";

export type PaymentStatus =
  | "Initiated"
  | "Pending"
  | "Processing"
  | "Successful"
  | "Failed"
  | "Cancelled"
  | "Refund Initiated"
  | "Partially Refunded"
  | "Refunded"
  | "COD Pending"
  | "COD Collected";

export type OrderStatus =
  | "Confirmed"
  | "Processing"
  | "Dispatched"
  | "Delivered"
  | "Cancelled"
  | "Disputed";

export interface GatewayConfig {
  id: PaymentGatewayId;
  name: string;
  isEnabled: boolean;
  status: "Connected" | "Not Connected";
  mode: "Test" | "Live";
  apiKey: string; // Stored securely; masked in display
  secretKeyMasked: string;
  webhookUrl: string;
  supportedCurrencies: string[];
  supportedMethods: string[];
}

export interface BusinessPaymentSettings {
  codEnabled: boolean;
  enabledMethods: {
    upi: boolean;
    card: boolean;
    netbanking: boolean;
    wallets: boolean;
    emi: boolean;
    cod: boolean;
  };
  settlementAccount: {
    beneficiaryName: string;
    accountNumberMasked: string;
    ifscCode: string;
    bankName: string;
    isVerified: boolean;
  };
}

export const INITIAL_GATEWAYS: GatewayConfig[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    isEnabled: true,
    status: "Connected",
    mode: "Test",
    apiKey: "rzp_test_NoryvantaMarketplace99",
    secretKeyMasked: "••••••••••••••••••••••••",
    webhookUrl: "https://api.noryvanta.in/v1/payments/webhooks/razorpay",
    supportedCurrencies: ["INR", "USD", "GBP", "EUR", "AED", "SGD"],
    supportedMethods: ["UPI", "CARD", "NET_BANKING", "WALLETS", "EMI"]
  },
  {
    id: "cashfree",
    name: "Cashfree Payments",
    isEnabled: true,
    status: "Connected",
    mode: "Test",
    apiKey: "cf_app_NoryvantaEscrowDirect",
    secretKeyMasked: "••••••••••••••••••••••••",
    webhookUrl: "https://api.noryvanta.in/v1/payments/webhooks/cashfree",
    supportedCurrencies: ["INR", "USD", "AED"],
    supportedMethods: ["UPI", "CARD", "NET_BANKING", "WALLETS", "PAY_LATER", "COD"]
  }
];

export const INITIAL_BUSINESS_PAYMENT_SETTINGS: BusinessPaymentSettings = {
  codEnabled: true,
  enabledMethods: {
    upi: true,
    card: true,
    netbanking: true,
    wallets: true,
    emi: true,
    cod: true
  },
  settlementAccount: {
    beneficiaryName: "Apex Precision Instruments Pvt. Ltd.",
    accountNumberMasked: "•••• •••• •••• 4821",
    ifscCode: "HDFC0001234",
    bankName: "HDFC Bank Ltd., Koramangala Branch",
    isVerified: true
  }
};
