"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  message: string;                          // texto curto do aviso
  href?: string;                            // link opcional (CTA inline)
  ctaLabel?: string;                        // texto do CTA
  variant?: "red" | "blue" | "dark" | "light";
  startAt?: string;                         // ISO: "2025-11-01T00:00:00Z"
  endAt?: string;                           // ISO: "2025-11-30T23:59:59Z"
  storageKey?: string;                      // chave única p/ lembrar o fechar
  fixed?: boolean;                          // true = fixa no topo (position: fixed)
};

const VAR = {
  red:  { wrap: "bg-red-600 text-white",             cta: "underline text-white" },
  blue: { wrap: "bg-brand-blue text-white",          cta: "underline text-white" },
  dark: { wrap: "bg-neutral-900 text-white",         cta: "underline text-white" },
  light:{ wrap: "bg-gray-100 text-gray-900",         cta: "underline text-brand-red" },
} as const;

export default function PromoBarCompact({
  message,
  href,
  ctaLabel = "Mehr",
  variant = "light",
  startAt,
  endAt,
  storageKey = "promo-bar-compact",
  fixed = false,
}: Props) {
  const [closed, setClosed] = useState(false);

  // janela de exibição (datas)
  const inWindow = useMemo(() => {
    const now = new Date();
    const afterStart = startAt ? now >= new Date(startAt) : true;
    const beforeEnd  = endAt   ? now <= new Date(endAt)   : true;
    return afterStart && beforeEnd;
  }, [startAt, endAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setClosed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (closed || !inWindow) return null;

  const s = VAR[variant];

  return (
    <div
      className={`${s.wrap} text-sm`}
      style={fixed ? { position: "fixed", top: 0, left: 0, right: 0, zIndex: 60 } : { position: "sticky", top: 0, zIndex: 40 }}
      role="status"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-3">
        <div className="truncate">
          <span className="mr-2">⚡</span>
          <span className="truncate">{message}</span>
          {href && (
            <>
              <span className="mx-2">•</span>
              <Link href={href} className={s.cta}>{ctaLabel} →</Link>
            </>
          )}
        </div>

        <button
          aria-label="Schliessen"
          className={`h-7 w-7 grid place-items-center rounded ${variant === "light" ? "hover:bg-black/5" : "hover:bg-white/15"}`}
          onClick={() => {
            setClosed(true);
            try { localStorage.setItem(storageKey, "1"); } catch {}
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
