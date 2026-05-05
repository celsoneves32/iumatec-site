"use client";

import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "@/context/WishlistContext";
import { formatPriceCH } from "@/lib/formatPrice";

export default function MerkenPage() {
  const { items, clearWishlist, loading } = useWishlist();

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">
            Gemerkte Produkte
          </h1>
          <p className="mt-2 text-neutral-600">
            Deine gespeicherten Produkte auf einen Blick.
          </p>
        </div>

        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => clearWishlist()}
            disabled={loading}
            className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Liste leeren
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border bg-white p-8">
          <p className="text-neutral-600">Noch keine Produkte gespeichert.</p>
          <Link
            href="/produkte"
            className="mt-4 inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white"
          >
            Produkte ansehen
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.sku} className="rounded-3xl border bg-white p-5">
              <div className="relative mb-4 h-52 w-full overflow-hidden rounded-2xl bg-neutral-50">
                {item.image ? (
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-contain p-5"
                    unoptimized
                  />
                ) : null}
              </div>

              <div className="text-sm font-semibold text-brand">
                {item.brand || "IUMATEC"}
              </div>

              <h2 className="mt-2 line-clamp-3 text-lg font-bold text-neutral-900">
                {item.title}
              </h2>

              <div className="mt-4 text-2xl font-extrabold text-neutral-950">
                {formatPriceCH(item.price || 0)}
              </div>

              <div className="mt-1 text-xs text-neutral-500">inkl. MWST</div>

              {item.slug ? (
                <Link
                  href={`/produkte/${item.slug}`}
                  className="mt-5 inline-flex rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-50"
                >
                  Details ansehen
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}