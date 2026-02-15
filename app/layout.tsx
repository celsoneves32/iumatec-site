// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Providers from "@/components/Providers";
import CookieConsent from "@/components/CookieConsent";

const SITE_NAME = "IUMATEC";
const SITE_URL = "https://iumatec.ch";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "IUMATEC – Premium Tech Store Schweiz",
    template: "%s | IUMATEC",
  },
  description:
    "Elektronik & Technik zum besten Preis – schnelle Lieferung in der ganzen Schweiz. Sichere Bezahlung & Schweizer Support.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "IUMATEC – Premium Tech Store Schweiz",
    description:
      "Elektronik & Technik zum besten Preis – schnelle Lieferung in der ganzen Schweiz. Sichere Bezahlung & Schweizer Support.",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630, alt: "IUMATEC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "IUMATEC – Premium Tech Store Schweiz",
    description:
      "Elektronik & Technik zum besten Preis – schnelle Lieferung in der ganzen Schweiz. Sichere Bezahlung & Schweizer Support.",
    images: ["/opengraph-image.png"],
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
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

function TrackingScripts() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <>
      {/* global consent state (CookieConsent deve disparar "iumatec_consent_updated") */}
      <Script id="consent-helper" strategy="beforeInteractive">
        {`
          window.__cookieConsent = window.__cookieConsent || { analytics: false, marketing: false };
          window.addEventListener("iumatec_consent_updated", function(e) {
            try { window.__cookieConsent = e.detail || window.__cookieConsent; } catch(_) {}
          });
        `}
      </Script>

      {/* Google Analytics (GA4) – só ativa após consent analytics */}
      {gaId ? (
        <>
          <Script strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              // default denied
              gtag('consent', 'default', { 'analytics_storage': 'denied' });

              function iumatecEnableGA() {
                gtag('consent', 'update', { 'analytics_storage': 'granted' });
                gtag('config', '${gaId}', {
                  anonymize_ip: true,
                  page_path: window.location.pathname,
                });
              }

              if (window.__cookieConsent && window.__cookieConsent.analytics) {
                iumatecEnableGA();
              }

              window.addEventListener("iumatec_consent_updated", function() {
                if (window.__cookieConsent && window.__cookieConsent.analytics) {
                  iumatecEnableGA();
                }
              });
            `}
          </Script>
        </>
      ) : null}

      {/* Meta Pixel – só ativa após consent marketing */}
      {pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            function iumatecEnablePixel() {
              if (window.__pixelEnabled) return;
              window.__pixelEnabled = true;

              !(function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)})(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');

              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            }

            if (window.__cookieConsent && window.__cookieConsent.marketing) {
              iumatecEnablePixel();
            }

            window.addEventListener("iumatec_consent_updated", function() {
              if (window.__cookieConsent && window.__cookieConsent.marketing) {
                iumatecEnablePixel();
              }
            });
          `}
        </Script>
      ) : null}
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-CH">
      <body className="min-h-screen bg-white text-neutral-900">
        <Providers>
          <SiteHeader />
          <TrackingScripts />

          {children}

          <SiteFooter />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
