// components/CookieConsent.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

type Props = {
  gaId?: string;
  metaPixelId?: string;
};

const KEY = "iumatec_cookie_consent_v1";

export default function CookieConsent({ gaId, metaPixelId }: Props) {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "granted" || saved === "denied") setConsent(saved);
    } catch {}
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "granted");
    } catch {}
    setConsent("granted");
  }

  function decline() {
    try {
      localStorage.setItem(KEY, "denied");
    } catch {}
    setConsent("denied");
  }

  const shouldLoad = consent === "granted";
  const showBanner = consent === null;

  const hasGA = useMemo(() => Boolean(gaId && gaId.trim().length > 0), [gaId]);
  const hasPixel = useMemo(
    () => Boolean(metaPixelId && metaPixelId.trim().length > 0),
    [metaPixelId]
  );

  return (
    <>
      {/* ✅ Load Google Analytics AFTER consent */}
      {shouldLoad && hasGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { anonymize_ip: true });
              `,
            }}
          />
        </>
      )}

      {/* ✅ Load Meta Pixel AFTER consent */}
      {shouldLoad && hasPixel && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${metaPixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Banner */}
      {showBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-3xl rounded-2xl border bg-white p-4 shadow-lg">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-neutral-700">
              <div className="font-medium text-neutral-900">
                Cookies & Tracking
              </div>
              <div className="mt-1">
                Wir verwenden Cookies für Analytics & Marketing, um die Website zu
                verbessern. Du kannst zustimmen oder ablehnen.
              </div>
            </div>

            <div className="flex gap-2 md:shrink-0">
              <button
                onClick={decline}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50"
              >
                Ablehnen
              </button>
              <button
                onClick={accept}
                className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90"
              >
                Akzeptieren
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs text-neutral-500">
            Details in{" "}
            <a className="underline" href="/datenschutz">
              Datenschutz
            </a>
            .
          </div>
        </div>
      )}
    </>
  );
}
