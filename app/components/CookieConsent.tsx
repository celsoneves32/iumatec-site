"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ConsentValue = "accepted" | "rejected";

const STORAGE_KEY = "cookie-consent";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY) as ConsentValue | null;
    if (!stored) {
      setVisible(true);
    }
  }, []);

  const updateConsent = (value: ConsentValue) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, value);

      const gtag = (window as any).gtag;
      if (typeof gtag === "function") {
        gtag("consent", "update", {
          ad_storage: value === "accepted" ? "granted" : "denied",
          analytics_storage: value === "accepted" ? "granted" : "denied",
        });
      }
    }

    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-neutral-900/95 text-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-snug">
          <p className="font-semibold">Cookies & Tracking</p>
          <p className="mt-1 text-xs sm:text-sm text-neutral-200">
            Wir verwenden Cookies, um unsere Website zu verbessern und anonyme
            Nutzungsstatistiken zu erheben. Sie können optionale Cookies
            akzeptieren oder nur die notwendigen verwenden. Mehr Infos in
            unserer{" "}
            <Link
              href="/datenschutz"
              className="underline underline-offset-2 hover:text-red-400"
            >
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>

        <div className="flex gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={() => updateConsent("rejected")}
            className="px-4 py-2 rounded-md border border-neutral-500 text-xs sm:text-sm hover:bg-neutral-800"
          >
            Nur notwendige Cookies
          </button>
          <button
            type="button"
            onClick={() => updateConsent("accepted")}
            className="px-4 py-2 rounded-md bg-red-600 text-xs sm:text-sm font-semibold hover:bg-red-500"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
