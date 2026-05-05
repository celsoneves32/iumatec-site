"use client";

import Link from "next/link";
import { useCompare } from "@/context/CompareContext";

export default function CompareBar() {
  const { items } = useCompare();

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-4 rounded-2xl bg-white shadow-xl border px-5 py-3">
        <span className="text-sm font-semibold">
          {items.length} Produkte ausgewählt
        </span>

        <Link
          href="/compare"
          className="rounded-xl bg-blue-600 px-4 py-2 text-white text-sm font-semibold"
        >
          Vergleichen
        </Link>
      </div>
    </div>
  );
}