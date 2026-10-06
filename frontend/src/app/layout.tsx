import type { Metadata } from "next";
import "@/styles/globals.css";
import { I18nProvider } from "@/contexts/I18nContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MarketplaceProvider } from "@/contexts/MarketplaceContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { MobileNav } from "@/components/layout/MobileNav";

import { CountryProvider } from "@/contexts/CountryContext";
import { PaymentGatewayProvider } from "@/contexts/PaymentGatewayContext";

export const metadata: Metadata = {
  title: "Noryvanta - Global | Sovereign B2B Escrow Platform",
  description: "India's institutional B2B commercial wholesale marketplace with guaranteed escrow protection, GST statutory verification, and high-velocity trade.",
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-512.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body className="min-h-screen flex flex-col bg-surface text-primary overflow-x-hidden w-full" suppressHydrationWarning>
        <I18nProvider>
          <CountryProvider>
            <AuthProvider>
              <MarketplaceProvider>
                <PaymentGatewayProvider>
                  <Navbar />
                  <main className="flex-1 pb-16 md:pb-0 w-full overflow-x-hidden">
                    {children}
                  </main>
                  <Footer />
                  <MobileNav />
                </PaymentGatewayProvider>
              </MarketplaceProvider>
            </AuthProvider>
          </CountryProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
