// app/layout.tsx
import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import FooterBarMobile from "../components/FooterBarMobile";
import { CartProvider } from "@/context/CartContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import "./globals.css";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body
        className="font-sans antialiased bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100"
        style={{
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
        }}
      >
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="6846392b-664e-4cfd-a3e0-d16501f16bd6"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />

        <Script
          id="cookiebot-consent-mode"
          strategy="beforeInteractive"
          data-cookieconsent="ignore"
        >
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            gtag('consent', 'default', {
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              ad_storage: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'denied',
              personalization_storage: 'denied',
              security_storage: 'granted',
              wait_for_update: 500
            });
          `}
        </Script>

        <SessionProvider>
          <FavoritesProvider>
            <CartProvider>
              <SiteHeader />
              {children}
              <SiteFooter />
              <FooterBarMobile />
            </CartProvider>
          </FavoritesProvider>
        </SessionProvider>

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7G0853WGDN"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
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
