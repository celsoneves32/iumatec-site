import ProductBuyButton from "@/components/ProductBuyButton";

type ProductBuyBoxProps = {
  title: string;
  brand?: string | null;
  price: string;
  stockQty: number;
  inStock: boolean;
  merchandiseId?: string | null;
  productHandle: string;
  imageUrl?: string | null;
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

  return (
    <aside className="sticky top-28 rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-xl shadow-neutral-950/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-neutral-500">
            {brand || "IUMATEC"}
          </p>

          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-neutral-950">
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

        <div className="mt-1 text-4xl font-black tracking-tight text-neutral-950">
          {price}
        </div>

        <p className="mt-1 text-sm font-semibold text-neutral-500">
          inkl. MWST · Versand Schweiz
        </p>
      </div>

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
                Lieferung 1–3 Werktage
              </p>
              <p className="text-xs text-neutral-500">
                Bei verfügbarem Lagerbestand.
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