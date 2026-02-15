// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

import Providers from "@/components/Providers";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CookieConsent from "@/components/CookieConsent";

const SITE_NAME = "IUMATEC";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://iumatec.ch";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IUMATEC – Premium Tech Store Schweiz",
    template: "%s | IUMATEC",
  },
  description:
    "IUMATEC – Technik zum besten Preis. Schnelle Lieferung in der ganzen Schweiz. Sicher bezahlen, transparenter Support.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "IUMATEC – Premium Tech Store Schweiz",
    description:
      "Technik zum besten Preis. Schnelle Lieferung in der ganzen Schweiz.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "IUMATEC",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="de-CH">
      <body className="min-h-screen bg-white text-neutral-900">
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />

          {/* Loads tracking only after consent */}
          <CookieConsent gaId={gaId} metaPixelId={metaPixelId} />
        </Providers>
      </body>
    </html>
  );
}
