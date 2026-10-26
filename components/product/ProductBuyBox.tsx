import Link from "next/link";

import ProductBuyButton from "@/components/ProductBuyButton";

type VariantOption = {
  slug: string;
  href: string;
  label: string;
  color?: string | null;
  colorHex?: string | null;
  storage?: string | null;
  ram?: string | null;
  price: string;
  inStock: boolean;
  active: boolean;
};

type ProductBuyBoxProps = {
  title: string;
  brand?: string | null;
  price: string;
  stockQty: number;
  inStock: boolean;
  merchandiseId?: string | null;
  productHandle: string;
  imageUrl?: string | null;
  variants?: VariantOption[];
};

export default function ProductBuyBox({
  title,
  brand,
  price,
  stockQty,
  inStock,
  merchandiseId,
  productHandle,
  imageUrl,
  variants = [],
}: ProductBuyBoxProps) {
  const lowStock = inStock && stockQty > 0 && stockQty <= 3;

  const stockLabel = !inStock
    ? "Nicht verfügbar"
    : lowStock
      ? `Nur noch ${stockQty} Stück verfügbar`
      : "Sofort lieferbar";

  const stockStyle = !inStock
    ? "bg-neutral-100 text-neutral-500 ring-neutral-200"
    : lowStock
      ? "bg-orange-50 text-orange-700 ring-orange-100"
      : "bg-green-50 text-green-700 ring-green-100";

  const hasVariants = variants.length > 1;
  const hasColors = variants.some((variant) => Boolean(variant.color));

  return (
    <aside className="min-w-0 rounded-[2rem] border border-neutral-200 bg-white p-4 shadow-xl shadow-neutral-950/5 sm:p-6 lg:sticky lg:top-28">
      <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-wide text-neutral-500">
            {brand || "IUMATEC"}
          </p>

          <h1 className="mt-2 break-words text-2xl font-black leading-tight tracking-tight text-neutral-950 sm:text-3xl">
            {title}
          </h1>
        </div>

        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neutral-200 text-xl transition hover:bg-neutral-50"
          aria-label="Zur Merkliste hinzufügen"
        >
          ♥
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-4 py-2 text-sm font-black ring-1 ${stockStyle}`}
        >
          {stockLabel}
        </span>

        <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100">
          Schweiz
        </span>
      </div>

      <div className="mt-7 rounded-[1.5rem] bg-neutral-50 p-5">
        <p className="text-sm font-bold text-neutral-500">Preis</p>

        <div className="mt-1 break-words text-3xl font-black tracking-tight text-neutral-950 sm:text-4xl">
          {price}
        </div>

        <p className="mt-1 text-sm font-semibold text-neutral-500">
          Endpreis · Lieferung Schweiz
        </p>
      </div>

      {hasVariants ? (
        <div className="mt-5 rounded-[1.5rem] border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-neutral-950">
                {hasColors ? "Farbe / Ausführung" : "Ausführung"}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Wähle die gewünschte Variante.
              </p>
            </div>

            <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-black text-neutral-600">
              {variants.length} Varianten
            </span>
          </div>

          <div className="mt-4 grid gap-2">
            {variants.map((variant) => (
              <Link
                key={variant.slug}
                href={variant.href}
                className={
                  variant.active
                    ? "flex items-center justify-between gap-3 rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3"
                    : "flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 transition hover:border-neutral-950 hover:bg-neutral-50"
                }
                aria-current={variant.active ? "page" : undefined}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {variant.color ? (
                    <span
                      aria-hidden="true"
                      className="h-6 w-6 shrink-0 rounded-full border border-neutral-300 shadow-inner"
                      style={{ backgroundColor: variant.colorHex || "#d4d4d8" }}
                    />
                  ) : null}

                  <div className="min-w-0">
                    <p
                      className={
                        variant.active
                          ? "truncate text-sm font-black text-red-700"
                          : "truncate text-sm font-black text-neutral-900"
                      }
                    >
                      {variant.label}
                    </p>

                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-neutral-500">
                      {variant.storage ? <span>{variant.storage}</span> : null}
                      {variant.ram ? <span>RAM {variant.ram}</span> : null}
                      <span>
                        {variant.inStock ? "verfügbar" : "nicht verfügbar"}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="shrink-0 text-sm font-black text-neutral-900">
                  {variant.price}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5">
        <ProductBuyButton
          merchandiseId={merchandiseId}
          productHandle={productHandle}
          imageUrl={imageUrl ?? null}
          disabled={!inStock}
        />
      </div>

      <div className="mt-5 grid gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🚚</span>
            <div>
              <p className="text-sm font-black text-neutral-950">
                Lieferung in der Regel 2–5 Werktage
              </p>
              <p className="text-xs text-neutral-500">
                Lieferung innerhalb der Schweiz.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-black text-neutral-950">
                Sicherer Checkout
              </p>
              <p className="text-xs text-neutral-500">
                Zahlungsabwicklung über Shopify.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-black text-neutral-950">
                Originalware
              </p>
              <p className="text-xs text-neutral-500">
                Produkte von offiziellen Distributoren.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-white">
        <p className="text-sm font-black">Business Anfrage?</p>
        <p className="mt-1 text-xs leading-5 text-white/70">
          Für grössere Stückzahlen, Firmenausstattung oder Projektbedarf kannst
          du IUMATEC direkt kontaktieren.
        </p>
      </div>
    </aside>
  );
}
