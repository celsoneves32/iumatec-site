import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// IUMATEC Black November 2026: selected by exact Shopify SKU.
// These are existing shop prices, NOT promotional reductions.
// A price mismatch or missing/invalid stock hides an item (fail closed).
const PICKS = [
  { sku: "TKMMT SAM A27 5G 128GB BLACK", price: 299.0 },
  { sku: "NO AC ASP 17 AG17-31P-C1Z3", price: 499.0 },
  { sku: "TKMMT XIA REDMI A7 PRO 4G 128G", price: 159.0 },
  { sku: "SP GAZ SO PS PORTAL REMOTE P", price: 243.35 },
  { sku: "MON AS XG27UCSR", price: 403.25 },
  { sku: "NO AC ASP LITE AL15-47P-R325", price: 599.0 },
  { sku: "SMA KH XIA RM BUDS 6 PLAY WHT", price: 15.0 },
  { sku: "GES XIA REDMI WATCH 5 BLA", price: 66.0 },
  { sku: "SP GAZ SO PS PULSE ELITE W", price: 171.1 },
  { sku: "SSD SAM 990 EVO PLUS 1TB M.2", price: 263.0 },
  { sku: "GR GW RTX5060TI PYTH III 16GB", price: 743.2 },
  { sku: "MON SAM LS27HG702SUXEN G70SH", price: 739.0 },
] as const;

type CatalogRow = {
  sku: string;
  slug: string | null;
  title: string | null;
  brand: string | null;
  price: number | string | null;
  image: string | null;
  category: string | null;
  subcategory: string | null;
  in_stock: boolean | null;
  stock_qty: number | null;
  merchandise_id: string | null;
  shopify_product_handle: string | null;
  shopify_variant_id: string | null;
  shopify_sync_status: string | null;
};

async function getSelectedProducts() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("products")
    .select(
      "sku,slug,title,brand,price,image,category,subcategory,in_stock,stock_qty,merchandise_id,shopify_product_handle,shopify_variant_id,shopify_sync_status",
    )
    .in("sku", PICKS.map((pick) => pick.sku))
    .eq("in_stock", true)
    .gt("stock_qty", 0)
    .limit(40);

  if (error) {
    console.error("IUMATEC Black November selection read failed:", error.message);
    return [];
  }

  const rows = new Map<string, CatalogRow>();
  const duplicates = new Set<string>();
  for (const raw of data || []) {
    const row = raw as CatalogRow;
    if (rows.has(row.sku)) duplicates.add(row.sku);
    rows.set(row.sku, row);
  }

  return PICKS.flatMap((pick) => {
    const row = rows.get(pick.sku);
    if (!row || duplicates.has(pick.sku)) return [];
    const price = Number(row.price);
    // Fail closed rather than show a stale Supabase price beside Shopify checkout.
    if (!Number.isFinite(price) || Math.abs(price - pick.price) > 0.011) return [];
    if (
      !row.slug || !row.title || !row.image ||
      row.in_stock !== true || Number(row.stock_qty) <= 0 ||
      (!row.merchandise_id && !row.shopify_variant_id) ||
      row.shopify_sync_status === "unmatched_shopify"
    ) return [];

    return [{
      sku: row.sku,
      slug: row.slug,
      title: row.title,
      brand: row.brand || undefined,
      price,
      image: row.image,
      category: row.category || undefined,
      subcategory: row.subcategory || undefined,
      inStock: true,
      stockQty: Number(row.stock_qty),
      merchandiseId: row.merchandise_id || row.shopify_variant_id,
      productHandle: row.shopify_product_handle || row.slug,
    }];
  });
}

export default async function BlackNovemberProducts() {
  const products = await getSelectedProducts();
  if (products.length === 0) return null;

  return (
    <section id="produkte" className="py-12">
      <div className="mb-9 overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-r from-amber-400/20 via-neutral-900 to-neutral-950 p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
          BLACK FRIDAY WEEKEND · IUMATEC SCHWEIZ
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              Top-Technik für dein nächstes Upgrade
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              Gaming, Smartphones, Notebooks und Zubehör. Persönlich ausgewählte
              Highlights aus unserem Schweizer Sortiment – zu den aktuell
              angezeigten Preisen.
            </p>
          </div>
          <Link
            href="/produkte"
            className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-neutral-950 transition hover:bg-amber-200"
          >
            Alle Technik entdecken
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Gaming", "Smartphones", "Notebooks", "Monitore", "Zubehör"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
          IUMATEC BLACK NOVEMBER · TOP AUSWAHL
        </p>
        <h2 className="mt-3 text-3xl font-black">
          Black Friday · Unsere Top-Auswahl
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          Smartphones, Notebooks, Gaming, Monitore und Zubehör –
          gezielt ausgewählt aus unserem Schweizer Sortiment.
          Aktuelle Verkaufspreise und Verfügbarkeit gelten beim Produkt.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
      <p className="mt-7 text-xs leading-6 text-neutral-400">
        Kuratierte Black-Friday-Auswahl, keine pauschalen Rabatte.
        Preisreduktionen werden nur nach bestätigter Kalkulation und
        Prüfung des Shopify-Checkout-Preises separat ausgewiesen.
      </p>
    </section>
  );
}
