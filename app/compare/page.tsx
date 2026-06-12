"use client";

import Link from "next/link";
import { useCompare } from "@/context/CompareContext";

function formatPrice(price: number) {
  return new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency: "CHF",
  }).format(price || 0);
}

function specText(item: any) {
  return `${item.title || ""} ${item.brand || ""} ${item.category || ""} ${
    item.subcategory || ""
  }`.toLowerCase();
}

function clean(value?: string | null) {
  return value ? value.replace(/\s+/g, " ").trim() : "-";
}

function extractSpecs(item: any) {
  const text = specText(item);

  return {
    cpu: clean(
      text.match(
        /\b(m[1-9](\s?(pro|max|ultra))?|i[3579]-?\d{4,5}[a-z]*|u[3579]\s?\d{3,4}v?|ryzen\s?[3579]\s?\d{4}[a-z]*)\b/i
      )?.[0]
    ),

    ram: clean(text.match(/\b(8|16|24|32|64|128)\s?gb\b/i)?.[0]),

    storage: clean(
      text.match(/\b(128|256|512)\s?gb\b/i)?.[0] ||
        text.match(/\b(1|2|4|8)\s?tb\b/i)?.[0]
    ),

    display: clean(
      text.match(/\b(11|12|13|14|15|16|17|24|27|32|34|49)(\.|,)?\d?\s?("|zoll)\b/i)
        ?.[0]
    ),

    gpu: clean(
      text.match(
        /\b(rtx\s?\d{4}|gtx\s?\d{4}|radeon|intel arc|iris xe|uhd graphics)\b/i
      )?.[0]
    ),

    resolution: clean(
      text.match(
        /\b(4k|uhd|qhd|wqhd|fhd|full hd|2560x1440|3840x2160|1920x1080)\b/i
      )?.[0]
    ),

    hz: clean(text.match(/\b(60|75|100|120|144|165|240)\s?hz\b/i)?.[0]),

    color: clean(
      text.match(
        /\b(schwarz|black|silber|silver|grau|grey|gray|blau|blue|gold|starlight|midnight|mitternacht|space black|space schwarz|platinum)\b/i
      )?.[0]
    ),
  };
}

function isDifferent(values: string[]) {
  const cleanValues = values
    .filter((v) => v && v !== "-")
    .map((v) => v.toLowerCase());

  return new Set(cleanValues).size > 1;
}

function SpecRow({ label, values }: { label: string; values: string[] }) {
  const different = isDifferent(values);

  return (
    <tr>
      <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
        {label}
      </td>

      {values.map((value, index) => (
        <td
          key={`${label}-${index}`}
          className={`border-b border-neutral-200 px-5 py-4 ${
            different && value !== "-"
              ? "bg-red-50 font-extrabold text-red-700"
              : ""
          }`}
        >
          {value}
        </td>
      ))}
    </tr>
  );
}

export default function ComparePage() {
  const { items, removeCompare, clearCompare } = useCompare();
  const specs = items.map((item) => extractSpecs(item));

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
          <table className="w-full min-w-[900px] border-collapse text-sm">
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

              <SpecRow label="CPU / Prozessor" values={specs.map((s) => s.cpu)} />
              <SpecRow label="RAM" values={specs.map((s) => s.ram)} />
              <SpecRow label="Speicher" values={specs.map((s) => s.storage)} />
              <SpecRow label="Displaygrösse" values={specs.map((s) => s.display)} />
              <SpecRow label="Grafik" values={specs.map((s) => s.gpu)} />
              <SpecRow label="Auflösung" values={specs.map((s) => s.resolution)} />
              <SpecRow
                label="Bildwiederholrate"
                values={specs.map((s) => s.hz)}
              />
              <SpecRow label="Farbe" values={specs.map((s) => s.color)} />

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
                    {(item as any).category || "-"}
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
                    {(item as any).subcategory || "-"}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="border-b border-neutral-200 bg-neutral-50 px-5 py-4 font-black">
                  Verfügbarkeit
                </td>
                {items.map((item) => {
                  const available =
                    (item as any).inStock || Number((item as any).stockQty || 0) > 0;

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
                <td className="bg-neutral-50 px-5 py-4 font-black">Aktion</td>
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