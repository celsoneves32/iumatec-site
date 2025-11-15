"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";
type ConsentValue = "accepted" | "rejected";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(STORAGE_KEY) as
      | ConsentValue
      | null;

    // Se ainda não tiver escolha guardada, mostra o banner
    if (!stored) {
      setVisible(true);
    }
  }, []);

  function handleChoice(value: ConsentValue) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, value);
    }

    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="max-w-4xl w-full rounded-2xl bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-700 shadow-lg p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 text-sm">
        <div className="flex-1">
          <p className="font-semibold">Cookies & Datenschutz</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300 text-xs md:text-sm">
            Wir verwenden Cookies, um unsere Website zu verbessern und
            Statistiken (Google Analytics) zu messen. Du kannst nur technisch
            notwendige Cookies zulassen oder allen zustimmen.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleChoice("rejected")}
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-600 text-xs md:text-sm"
          >
            Nur notwendige
          </button>

          <button
            type="button"
            onClick={() => handleChoice("accepted")}
            className="px-3 py-2 rounded-xl bg-brand-red text-white text-xs md:text-sm font-semibold hover:opacity-90"
          >
            Alle akzeptieren
          </button>
        </div>
      </div>
    </div>
  );
}
