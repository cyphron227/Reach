import type { Metadata } from "next";
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
  title: "Reach - Stay close to who matters",
  description: "A calm relationship companion that helps you maintain meaningful connections",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-cream`}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
