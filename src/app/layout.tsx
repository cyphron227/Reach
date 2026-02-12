import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import { DeepLinkHandler } from '@/components/DeepLinkHandler';
import Providers from '@/components/Providers';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
        {/* Anti-FOUC: apply saved theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ringur-theme');if(t==='dark'){document.documentElement.classList.add('dark')}else if(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
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
      <body className={`${inter.variable} font-sans antialiased bg-bone dark:bg-dark-bg transition-colors duration-calm`}>
        <Providers>
          <DeepLinkHandler />
          {/* Fixed status bar background for mobile devices */}
          <div
            className="fixed top-0 left-0 right-0 bg-bone dark:bg-dark-bg z-[100] transition-colors duration-calm"
            style={{ height: 'env(safe-area-inset-top, 0px)' }}
            aria-hidden="true"
          />
          {children}
        </Providers>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
