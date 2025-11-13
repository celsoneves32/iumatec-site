"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  title: string;
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
  variant?: "red" | "blue" | "dark";
  icon?: string;
  startAt?: string;
  endAt?: string;
  storageKey: string; // permite esconder a promoção
};

export default function PromoBanner({
  title,
  subtitle,
  href = "#",
  ctaLabel = "Jetzt ansehen",
  variant = "red",
  icon = "🔥",
  startAt,
  endAt,
  storageKey
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Se o utilizador fechou antes, não mostrar
    if (typeof window !== "undefined") {
      const hidden = localStorage.getItem(storageKey);
      if (hidden === "true") return;
    }

    // Datas de ativação
    const now = new Date();
    if (startAt) {
      const start = new Date(startAt);
      if (now < start) return;
    }
    if (endAt) {
      const end = new Date(endAt);
      if (now > end) return;
    }

    setVisible(true);
  }, [storageKey, startAt, endAt]);

  if (!visible) return null;

  const color =
    variant === "red"
      ? "from-red-600 to-red-500"
      : variant === "blue"
      ? "from-blue-600 to-blue-500"
      : "from-neutral-800 to-neutral-700";

  return (
    <div className={`rounded-xl p-4 mb-4 bg-gradient-to-r ${color} text-white relative overflow-hidden`}>
      <button
        onClick={() => {
          localStorage.setItem(storageKey, "true");
          setVisible(false);
        }}
        className="absolute right-3 top-3 text-white/80 hover:text-white"
      >
        ✕
      </button>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
        <div className="text-3xl">{icon}</div>

        <div className="flex-1">
          <h3 className="font-bold text-lg">{title}</h3>
          {subtitle && <p className="text-white/85 text-sm">{subtitle}</p>}
        </div>

        <Link
          href={href}
          className="rounded-lg bg-white text-black px-4 py-2 font-semibold hover:bg-white/90"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
