"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = {
  /** Título grande do banner */
  title: string;
  /** Subtítulo opcional */
  subtitle?: string;
  /** Link do CTA */
  href?: string;
  /** Texto do CTA */
  ctaLabel?: string;
  /** Variante de cor */
  variant?: "red" | "blue" | "dark" | "light";
  /** ISO date strings: controlam quando o banner aparece */
  startAt?: string; // ex: "2025-11-01T00:00:00Z"
  endAt?: string;   // ex: "2025-11-30T23:59:59Z"
  /** Chave única para o localStorage (necessário para 'lembrar' o fechar) */
  storageKey?: string; // ex: "promo-blackfriday-2025"
  /** Ícone opcional (emoji simples) */
  icon?: string; // ex: "🔥"
};

const stylesByVariant: Record<
  NonNullable<Props["variant"]>,
  { wrapper: string; cta: string }
> = {
  red: {
    wrapper:
      "bg-gradient-to-r from-red-600 via-red-500 to-brand-blue text-white",
    cta: "bg-white text-black hover:opacity-90",
  },
  blue: {
    wrapper:
      "bg-gradient-to-r from-brand-blue to-blue-600 text-white",
    cta: "bg-white text-black hover:opacity-90",
  },
  dark: {
    wrapper: "bg-neutral-900 text-white",
    cta: "bg-white text-black hover:opacity-90",
  },
  light: {
    wrapper: "bg-gray-100 text-gray-900",
    cta: "bg-brand-red text-white hover:bg-brand-blue",
  },
};

export default function PromoBanner({
  title,
  subtitle,
  href,
  ctaLabel = "Jetzt sichern",
  variant = "red",
  startAt,
  endAt,
  storageKey = "promo-banner",
  icon = "🔥",
}: Props) {
  const [closed, setClosed] = useState(false);

  // respeita janela de tempo
  const inWindow = useMemo(() => {
    const now = new Date();
    const afterStart = startAt ? now >= new Date(startAt) : true;
    const beforeEnd = endAt ? now <= new Date(endAt) : true;
    return afterStart && beforeEnd;
  }, [startAt, endAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isClosed = localStorage.getItem(storageKey) === "1";
    setClosed(isClosed);
  }, [storageKey]);

  if (closed || !inWindow) return null;

  const s = stylesByVariant[variant];

  return (
    <div className={`relative overflow-hidden ${s.wrapper}`}>
      <div className="max-w-7xl mx-auto px-4 py-4 md:py-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl">{icon}</span>
            <div>
              <p className="text-base md:text-lg font-semibold leading-snug">
                {title}
              </p>
              {subtitle ? (
                <p className="text-sm md:text-base opacity-90">{subtitle}</p>
              ) : null}
            </div>
          </div>

          {href ? (
            <Link
              href={href}
              className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold ${s.cta}`}
            >
              {ctaLabel} →
            </Link>
          ) : null}
        </div>
      </div>

      {/* botão fechar */}
      <button
        aria-label="Banner schliessen"
        className="absolute right-3 top-3 h-8 w-8 grid place-items-center rounded-full bg-white/20 hover:bg-white/30 text-white"
        onClick={() => {
          setClosed(true);
          try {
            localStorage.setItem(storageKey, "1");
          } catch {}
        }}
      >
        ✕
      </button>
    </div>
  );
}
