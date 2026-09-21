"use client";

import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { LanguageProvider } from "@/components/landing/LanguageContext";
import { TopContactBar } from "@/components/landing/TopContactBar";
import { WhatsAppFloatingButton } from "@/components/landing/WhatsAppFloatingButton";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-white font-sans text-gray-900 antialiased">
        <TopContactBar />
        <Header />
        <main>{children}</main>
        <Footer />
        <WhatsAppFloatingButton />
      </div>
    </LanguageProvider>
  );
}
