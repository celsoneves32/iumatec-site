// components/HeaderSearch.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function HeaderSearch() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/produkte?search=${encodeURIComponent(q)}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-xl"
      role="search"
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Suche nach Produkten…"
        className="w-full rounded-full border border-neutral-300 bg-white px-4 py-2.5 pr-10 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
      />
      <button
        type="submit"
        className="absolute inset-y-0 right-2 flex items-center justify-center rounded-full px-2 text-neutral-500 hover:text-red-600"
        aria-label="Suche starten"
      >
        {/* Ícone de lupa simples */}
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="6" />
          <line x1="16" y1="16" x2="21" y2="21" />
        </svg>
      </button>
    </form>
  );
}
