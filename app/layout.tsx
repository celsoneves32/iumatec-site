// app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";

// ✅ Ajusta estes imports conforme o teu projeto
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Providers from "@/components/Providers"; // se não existir, remove

import CookieConsent from "@/components/CookieConsent"; // (código abaixo)

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
    "Hochwertige Technikprodukte online kaufen. Schnelle Lieferung in der Schweiz. Top Preise, geprüfte Qualität und sicherer Checkout.",
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
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
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "IUMATEC – Premium Tech Store Schweiz",
    description:
      "Hochwertige Technikprodukte online kaufen. Schnelle Lieferung in der Schweiz. Sicherer Checkout über Shopify.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "IUMATEC – Premium Tech Store Schweiz",
      },
    ],
    locale: "de_CH",
  },
  twitter: {
    card: "summary_large_image",
    title: "IUMATEC – Premium Tech Store Schweiz",
    description:
      "Hochwertige Technikprodukte online kaufen. Schnelle Lieferung in der Schweiz. Sicherer Checkout über Shopify.",
    images: ["/opengraph-image.png"],
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // ✅ IDs via env vars (Vercel)
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
  const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="de-CH">
      <body className="min-h-screen bg-white text-neutral-900">
        {/* ✅ Consent + Analytics/Pixels (só dispara após consentimento no componente) */}
        {/* Se quiseres SEM consentimento (não recomendado), eu digo-te já como simplificar */}
        <CookieConsent gaId={GA_ID} metaPixelId={META_PIXEL_ID} />

        {/* Estrutura */}
        <Providers>
          <SiteHeader />
          {children}
          <SiteFooter />
        </Providers>

        {/* ✅ Opcional: Preconnect (ligeiro boost performance) */}
        <Script
          id="preconnect-shopify"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var l = document.createElement('link');
                  l.rel='preconnect';
                  l.href='https://cdn.shopify.com';
                  l.crossOrigin='anonymous';
                  document.head.appendChild(l);
                } catch(e) {}
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
