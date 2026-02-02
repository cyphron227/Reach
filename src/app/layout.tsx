import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { DeepLinkHandler } from '@/components/DeepLinkHandler';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Ringur - Stay close to who matters",
  description: "A calm relationship companion that helps you maintain meaningful connections",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HR6M9B0135"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HR6M9B0135');
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} font-sans antialiased bg-cream`}>
        <DeepLinkHandler />
        {/* Fixed status bar background for mobile devices */}
        <div
          className="fixed top-0 left-0 right-0 bg-lavender-50 z-[100]"
          style={{ height: 'env(safe-area-inset-top, 0px)' }}
          aria-hidden="true"
        />
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
