// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";

import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FooterBarMobile from "../components/FooterBarMobile";
import "./globals.css";

export const metadata: Metadata = {
  title: "IUMATEC – Technik zu unschlagbaren Preisen",
  description:
    "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
  icons: {
    icon: "/favicon.ico",
    other: [
      { rel: "icon", url: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", url: "/apple-touch-icon.png" },
    ],
  },
  manifest: "/site.webmanifest",
  metadataBase: new URL("https://iumatec.ch"),
  openGraph: {
    title: "IUMATEC – Technik zu unschlagbaren Preisen",
    description:
      "Smartphones, TV & Audio, Informatik, Gaming – schnelle Lieferung in der ganzen Schweiz.",
    url: "https://iumatec.ch",
    siteName: "IUMATEC Schweiz",
    locale: "de_CH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IUMATEC – Technik zu unschlagbaren Preisen",
    description:
      "Technik und Elektronikprodukte mit schneller Lieferung in der ganzen Schweiz.",
    site: "@iumatec",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="de">
      {/* Cookiebot – tem de ser o PRIMEIRO script */}
      <Script
        id="cookiebot"
        src="https://consent.cookiebot.com/uc.js"
        data-cbid="6846392b-664e-4cfd-a3e0-d16501f16bd6"
        data-blockingmode="auto"
        type="text/javascript"
        strategy="beforeInteractive"
      />

      <body
        className="font-sans antialiased bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <SiteHeader />
        {children}
        <SiteFooter />
        <FooterBarMobile />

        {/* Google Analytics – GA4 (bloqueado pelo Cookiebot até o utilizador aceitar estatísticas) */}
        <Script
          id="ga4-src"
          src="https://www.googletagmanager.com/gtag/js?id=G-7G0853WGDN"
          strategy="afterInteractive"
          data-cookieconsent="statistics"
        />
        <Script
          id="ga4-inline"
          strategy="afterInteractive"
          data-cookieconsent="statistics"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7G0853WGDN');
          `}
        </Script>
      </body>
    </html>
  );
}
