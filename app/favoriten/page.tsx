"use client";

import Link from "next/link";
import Image from "next/image";
import { useFavorites } from "@/context/FavoritesContext";
import { PRODUCTS, getProductById } from "@/data/products";

export default function FavoritesPage() {
  const { ids, toggle } = useFavorites();

  const favoriteProducts = ids
    .map((id) => getProductById(id))
    .filter((p): p is (typeof PRODUCTS)[number] => Boolean(p));

  const hasFavorites = favoriteProducts.length > 0;

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-2">Favoriten</h1>
      <p className="text-sm text-neutral-600 mb-6">
        Merke dir Produkte, die du später vergleichen oder bestellen möchtest.
      </p>

      {!hasFavorites && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Du hast noch keine Favoriten.
          <div className="mt-4">
            <Link
              href="/produkte"
              className="inline-block px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition"
            >
              Jetzt Produkte entdecken
            </Link>
          </div>
        </div>
      )}

      {hasFavorites && (
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {favoriteProducts.map((product) => (
            <article
              key={product.id}
              className="group rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col"
            >
              <Link
                href={`/produkte/${product.id}`}
                className="block relative w-full aspect-[4/3] overflow-hidden rounded-t-2xl"
              >
                <Image
                  src={product.image}
                  alt={product.title}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              </Link>

              <div className="flex flex-1 flex-col p-4 gap-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500">
                  {product.category}
                </p>
                <Link
                  href={`/produkte/${product.id}`}
                  className="line-clamp-2 text-sm font-semibold text-neutral-900 group-hover:text-red-600"
                >
                  {product.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-xs text-neutral-600">
                  {product.description}
                </p>

                <div className="mt-2 flex items-center justify-between">
                  <p className="text-base font-semibold text-neutral-900">
                    CHF {product.price.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    onClick={() => toggle(product.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Entfernen
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
