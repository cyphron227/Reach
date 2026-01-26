import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';

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
      <body className={`${geistSans.variable} font-sans antialiased bg-cream`}>
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
