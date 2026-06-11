"use client";

import Link from "next/link";
import { useCompare } from "@/context/CompareContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(price || 0);
}

export default function ComparePage() {
  const { items, removeCompare, clearCompare } = useCompare();

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center">
          <h1 className="text-4xl font-black text-neutral-950">
            Produktvergleich
          </h1>

          <p className="mt-4 text-neutral-600">
            Noch keine Produkte zum Vergleich hinzugefügt.
          </p>

          <Link
            href="/produkte"
            className="mt-8 inline-flex rounded-2xl bg-red-600 px-7 py-4 font-extrabold text-white hover:bg-red-700"
          >
            Produkte ansehen
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-neutral-50">
      <section className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black text-neutral-950">
                Produktvergleich
              </h1>

              <p className="mt-2 text-neutral-600">
                {items.length} von maximal 4 Produkten im Vergleich.
              </p>
            </div>

            <button
              type="button"
              onClick={clearCompare}
              className="rounded-2xl border border-neutral-300 bg-white px-5 py-3 text-sm font-extrabold hover:bg-neutral-50"
            >
              Vergleich leeren
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <table className="min-w-[900px] w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-52 border-b border-neutral-200 bg-neutral-50 px-5 py-4 text-left font-black text-neutral-950">
                  Produkt
                </th>

                {items.map((item) => (
                  <th
                    key={item.sku}
                    className="w-72 border-b border-neutral-200 px-5 py-4 text-left align-top"
                  >
                    <div className="flex min-h-44 items-center justify-center rounded-2xl bg-neutral-50 p-4">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="max-h-36 max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-neutral-400">Kein Bild</span>
                      )}
                    </div>

                    <div className="mt-4 text-xs font-bold uppercase text-neutral-500">
                      {item.brand || "IUMATEC"}
                    </div>

                    <Link
                      href={`/produkte/${item.slug}`}
                      className="mt-1 block text-base font-black text-neutral-950 hover:text-red-600"
                    >
                      {item.title}
                    </Link>

                    <button
                      type="button"
                      onClick={() => removeCompare(item.sku)}
                      className="mt-3 text-xs font-bold text-red-600 hover:text-red-700"
                    >
                      Entfernen
                    </button>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Preis
                </td>
                {items.map((item) => (
                  <td
                    key={`${item.sku}-price`}
                    className="border-b border-neutral-200 px-5 py-4 text-xl font-black"
                  >
                    {formatPrice(item.price)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Marke
                </td>
                {items.map((item) => (
                  <td
                    key={`${item.sku}-brand`}
                    className="border-b border-neutral-200 px-5 py-4"
                  >
                    {item.brand || "-"}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Kategorie
                </td>
                {items.map((item) => (
                  <td
                    key={`${item.sku}-category`}
                    className="border-b border-neutral-200 px-5 py-4"
                  >
                    {item.category || "-"}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Subkategorie
                </td>
                {items.map((item) => (
                  <td
                    key={`${item.sku}-subcategory`}
                    className="border-b border-neutral-200 px-5 py-4"
                  >
                    {item.subcategory || "-"}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Verfügbarkeit
                </td>
                {items.map((item) => {
                  const available =
                    item.inStock || Number(item.stockQty || 0) > 0;

                  return (
                    <td
                      key={`${item.sku}-stock`}
                      className="border-b border-neutral-200 px-5 py-4"
                    >
                      <span
                        className={
                          available
                            ? "font-extrabold text-green-600"
                            : "font-extrabold text-neutral-400"
                        }
                      >
                        {available ? "Sofort lieferbar" : "Nicht verfügbar"}
                      </span>
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="bg-neutral-50 px-5 py-4 font-black">
                  Aktion
                </td>
                {items.map((item) => (
                  <td key={`${item.sku}-action`} className="px-5 py-4">
                    <Link
                      href={`/produkte/${item.slug}`}
                      className="inline-flex rounded-2xl bg-red-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-red-700"
                    >
                      Zum Produkt
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <Link
            href="/produkte"
            className="inline-flex rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-sm font-extrabold hover:bg-neutral-50"
          >
            Weitere Produkte vergleichen
          </Link>
        </div>
      </section>
    </main>
  );
}