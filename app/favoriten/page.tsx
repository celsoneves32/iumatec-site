// app/favoriten/page.tsx
"use client";

import Link from "next/link";
import { useFavorites } from "@/context/FavoritesContext";

export default function FavoritesPage() {
  const { ids, toggle } = useFavorites();
  const hasFavorites = ids.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
          Meine Favoriten
        </h1>
        <p className="text-sm text-neutral-600">
          Hier findest du Produkte, die du als Favorit markiert hast.
        </p>
      </header>

      {!hasFavorites ? (
        <div className="border border-dashed border-neutral-300 rounded-2xl p-8 text-center text-sm text-neutral-600 bg-neutral-50">
          Du hast noch keine Favoriten.
          <br />
          <span className="text-xs text-neutral-500">
            Füge Produkte über den Herz-Button auf der Produktseite zu deinen
            Favoriten hinzu.
          </span>
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-xs text-neutral-500">
            Aktuell hast du {ids.length} Favorit
            {ids.length > 1 ? "en" : ""}.
          </p>

          <ul className="space-y-2">
            {ids.map((id) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 border border-neutral-200 rounded-xl px-3 py-2 bg-white"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-neutral-900">
                    Produkt
                  </span>
                  <span className="text-xs text-neutral-500 break-all">
                    ID / Handle: {id}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/produkte/${id}`}
                    className="text-xs font-semibold text-red-600 hover:text-red-700"
                  >
                    Zum Produkt
                  </Link>
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="text-[11px] text-neutral-500 hover:text-red-600"
                  >
                    Entfernen
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
