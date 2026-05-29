export const dynamic = "force-dynamic";
export const revalidate = 0;

import { notFound } from "next/navigation";
import Link from "next/link";
import { getProductBySlug } from "@/lib/productData";
import { formatPriceCH } from "@/lib/formatPrice";
import { getStockStatus } from "@/lib/stock";
import { getDeliveryText } from "@/lib/delivery";
import ProductDatasheetButton from "@/components/ProductDatasheetButton";

type PageProps = {
  params: {
    slug: string;
  };
};

export default function ProductDatasheetPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const stock = getStockStatus(product);
  const delivery = getDeliveryText(product.deliveryDate);

  const rows = [
    { label: "Produkt", value: product.title || "" },
    { label: "Marke", value: product.brand || "" },
    { label: "Preis", value: formatPriceCH(product.price) },
    { label: "SKU", value: product.sku || "" },
    { label: "EAN", value: product.ean || "" },
    { label: "Interne Nummer", value: product.internalNumber || "" },
    { label: "Kategorie", value: product.category || "" },
    { label: "Unterkategorie", value: product.subcategory || "" },
    { label: "Verfügbarkeit", value: stock.label || "" },
    { label: "Lieferung", value: delivery || "Lieferdatum folgt" },
    { label: "Beschreibung", value: product.description || "" },
    { label: "Beschreibung 2", value: product.description2 || "" },
  ].filter((row) => row.value && String(row.value).trim() !== "");

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">
          Produktdatenblatt
        </h1>

        <div className="flex flex-wrap gap-3">
          <ProductDatasheetButton slug={product.slug} />

          <Link
            href={`/produkte/${product.slug}`}
            className="inline-flex rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Zur Produktseite
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 px-6 py-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">
            {product.brand || "IUMATEC"}
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-950">
            {product.title}
          </h1>

          <p className="mt-3 text-sm text-neutral-500">
            {[product.category, product.subcategory]
              .filter(Boolean)
              .join(" / ")}
          </p>
        </div>

        <div className="divide-y divide-neutral-200">
          {rows.map((row) => (
            <div
              key={row.label}
              className="grid gap-2 px-6 py-4 md:grid-cols-[220px_1fr]"
            >
              <div className="text-sm font-semibold text-neutral-500">
                {row.label}
              </div>

              <div className="whitespace-pre-wrap text-sm text-neutral-900">
                {row.value}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-neutral-200 px-6 py-5 text-xs text-neutral-500">
          IUMATEC Schweiz — Produktdatenblatt automatisch generiert.
        </div>
      </div>
    </main>
  );
}