"use client";

import Link from "next/link";
import { useCompare } from "@/context/CompareContext";

export default function CompareBar() {
  const { items, clearCompare } = useCompare();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 rounded-3xl border border-neutral-200 bg-white p-4 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-black text-neutral-950">
            {items.length} Produkte ausgewählt
          </div>
          <div className="text-xs text-neutral-500">
            Maximal 4 Produkte vergleichen.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={clearCompare}
            className="rounded-2xl border border-neutral-300 px-4 py-3 text-sm font-bold hover:bg-neutral-50"
          >
            Leeren
          </button>

          <Link
            href="/compare"
            className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-black text-white hover:bg-red-700"
          >
            Vergleichen
          </Link>
        </div>
      </div>
    </div>
  );
}