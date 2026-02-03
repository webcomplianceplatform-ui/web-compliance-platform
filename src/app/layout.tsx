import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { RouteProgress } from "@/components/app/RouteProgress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WebCompliance",
  description: "Multi-tenant SaaS: public site + legal + tickets + monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {/* RouteProgress uses useSearchParams; wrap it to satisfy Next.js prerendering rules */}
          <Suspense fallback={null}>
            <RouteProgress />
          </Suspense>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
