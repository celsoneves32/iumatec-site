import ProductCard from "@/components/ProductCard";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

// Neutral selection fallback: no price-comparison or discount claims.
const NORMAL_PICKS = [
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

// Standard price must still match Supabase and Shopify. The displayed sale
// price is derived from one of three currently ACTIVE automatic Shopify offers.
// This list is presentation-only; the checkout discount is administered by Shopify.
const SPECIAL_PICKS = [
  { sku: "MA LO MX VERTICAL", price: 120, salePrice: 84, variantId: "gid://shopify/ProductVariant/58466972696960", tier: "a" },
  { sku: "TA CHE KC4500 ERGO", price: 77.3, salePrice: 54.11, variantId: "gid://shopify/ProductVariant/58468049355136", tier: "a" },
  { sku: "TA LO MX KEYS COMBO FB 2GEN", price: 269, salePrice: 188.3, variantId: "gid://shopify/ProductVariant/58466946122112", tier: "a" },
  { sku: "NO HP ZU DOCK 9X3V1UT", price: 259, salePrice: 207.2, variantId: "gid://shopify/ProductVariant/57666312274304", tier: "b" },
  { sku: "AK FTM GAMING POWERBANK", price: 55.95, salePrice: 44.76, variantId: "gid://shopify/ProductVariant/58466973450624", tier: "b" },
  { sku: "MA LO M650 GRAPHITE", price: 50, salePrice: 40, variantId: "gid://shopify/ProductVariant/58466963718528", tier: "b" },
  { sku: "VI LENOVO PERFORMANCE WEBCAM", price: 77.65, salePrice: 69.89, variantId: "gid://shopify/ProductVariant/58468458267008", tier: "c" },
  { sku: "HS POLY VOY FOC2 9T9J3AA", price: 229, salePrice: 206.1, variantId: "gid://shopify/ProductVariant/58467149513088", tier: "c" },
  { sku: "MA LO LIFT GRAPHITE RIGHT", price: 80, salePrice: 72, variantId: "gid://shopify/ProductVariant/58467079061888", tier: "c" },
] as const;

type Pick = {
  sku: string;
  price: number;
  salePrice?: number;
  variantId?: string;
};

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

// If the Admin API, automatic offers, or matching variant prices are unavailable,
// show the original selection, NOT an unverifiable promotional price.
async function checkoutOffersVerified(): Promise<boolean> {
  const domain = String(process.env.SHOPIFY_STORE_DOMAIN || process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "")
    .trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const version = process.env.SHOPIFY_API_VERSION || "2026-10";
  if (!domain || !token || !/^[a-z0-9.-]+$/i.test(domain) || !/^\d{4}-\d{2}$/.test(version)) return false;
  if (Date.now() >= Date.parse("2026-12-01T00:00:00+01:00")) return false;

  const query = `query LiveBlackFriday($skus:String!) {
    a:discountNode(id:"gid://shopify/DiscountAutomaticNode/2335846662528") {
      discount { ... on DiscountAutomaticBasic {
        status customerGets {
          value { ... on DiscountPercentage { percentage } }
          items { ... on DiscountProducts { productVariants(first:10) { nodes { id } } } }
        }
      } }
    }
    b:discountNode(id:"gid://shopify/DiscountAutomaticNode/2335846695296") {
      discount { ... on DiscountAutomaticBasic {
        status customerGets {
          value { ... on DiscountPercentage { percentage } }
          items { ... on DiscountProducts { productVariants(first:10) { nodes { id } } } }
        }
      } }
    }
    c:discountNode(id:"gid://shopify/DiscountAutomaticNode/2335846728064") {
      discount { ... on DiscountAutomaticBasic {
        status customerGets {
          value { ... on DiscountPercentage { percentage } }
          items { ... on DiscountProducts { productVariants(first:10) { nodes { id } } } }
        }
      } }
    }
    variants:productVariants(first:30,query:$skus) {
      nodes { id sku price inventoryQuantity product { status } }
    }
  }`;
  try {
    const response = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables: { skus: SPECIAL_PICKS.map((p) => `sku:"${p.sku}"`).join(" OR ") } }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return false;
    const result = await response.json();
    if (result.errors?.length) return false;
    const data = result.data;
    if (!data) return false;
    for (const [tier, percentage] of [["a", 0.3], ["b", 0.2], ["c", 0.1]] as const) {
      const discount = data[tier]?.discount;
      if (discount?.status !== "ACTIVE" || Math.abs(Number(discount?.customerGets?.value?.percentage) - percentage) > 0.00001) return false;
      const actual = (discount?.customerGets?.items?.productVariants?.nodes || []).map((p: { id: string }) => p.id).sort();
      const expected = SPECIAL_PICKS.filter((p) => p.tier === tier).map((p) => p.variantId).sort();
      if (actual.length !== expected.length || actual.some((id: string, index: number) => id !== expected[index])) return false;
    }
    const found = data.variants?.nodes || [];
    for (const pick of SPECIAL_PICKS) {
      const matches = found.filter((p: { sku: string }) => p.sku === pick.sku);
      if (matches.length !== 1) return false;
      const row = matches[0];
      if (row.id !== pick.variantId || row.product?.status !== "ACTIVE" || Number(row.inventoryQuantity) <= 0 || Math.abs(Number(row.price) - pick.price) > 0.011) return false;
    }
    return true;
  } catch (error) {
    console.error("IUMATEC BF checkout verification failed:", error instanceof Error ? error.message : "unknown");
    return false;
  }
}

async function getSelectedProducts() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { products: [], saleReady: false };

  const saleReady = await checkoutOffersVerified();
  const picks: Pick[] = saleReady ? [...SPECIAL_PICKS] : [...NORMAL_PICKS];
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client
    .from("products")
    .select("sku,slug,title,brand,price,image,category,subcategory,in_stock,stock_qty,merchandise_id,shopify_product_handle,shopify_variant_id,shopify_sync_status")
    .in("sku", picks.map((pick) => pick.sku))
    .eq("in_stock", true)
    .gt("stock_qty", 0)
    .limit(40);

  if (error) {
    console.error("IUMATEC Black Friday selection read failed:", error.message);
    return { products: [], saleReady: false };
  }

  const rows = new Map<string, CatalogRow>();
  const duplicates = new Set<string>();
  for (const raw of data || []) {
    const row = raw as CatalogRow;
    if (rows.has(row.sku)) duplicates.add(row.sku);
    rows.set(row.sku, row);
  }

  const products = picks.flatMap((pick) => {
    const row = rows.get(pick.sku);
    if (!row || duplicates.has(pick.sku)) return [];
    const normalPrice = Number(row.price);
    if (!Number.isFinite(normalPrice) || Math.abs(normalPrice - pick.price) > 0.011) return [];
    const merchandiseId = row.merchandise_id || row.shopify_variant_id;
    if (
      !row.slug || !row.title || !row.image ||
      row.in_stock !== true || Number(row.stock_qty) <= 0 ||
      !merchandiseId || row.shopify_sync_status === "unmatched_shopify" ||
      (saleReady && merchandiseId !== pick.variantId)
    ) return [];

    return [{
      sku: row.sku,
      slug: row.slug,
      title: row.title,
      brand: row.brand || undefined,
      price: saleReady && pick.salePrice !== undefined ? pick.salePrice : normalPrice,
      image: row.image,
      category: row.category || undefined,
      subcategory: row.subcategory || undefined,
      inStock: true,
      stockQty: Number(row.stock_qty),
      merchandiseId,
      productHandle: row.shopify_product_handle || row.slug,
    }];
  });
  return { products, saleReady };
}

export default async function BlackNovemberProducts() {
  const { products, saleReady } = await getSelectedProducts();
  if (products.length === 0) return null;

  return (
    <section id="produkte" className="py-12">
      <div className="mb-9 overflow-hidden rounded-3xl border border-amber-300/30 bg-gradient-to-r from-amber-400/20 via-neutral-900 to-neutral-950 p-6 sm:p-9">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">
          BLACK FRIDAY WEEKEND Â· IUMATEC SCHWEIZ
        </p>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-black leading-tight text-white sm:text-4xl">
              {saleReady ? "Black Friday Â· Unsere Sonderpreise" : "Top-Technik fÃ¼r dein nÃ¤chstes Upgrade"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-neutral-300">
              {saleReady
                ? "Neun ausgewÃ¤hlte Technik-Angebote. Angezeigte Aktionspreise werden im Warenkorb automatisch angewendet; kein Code erforderlich."
                : "Gaming, Smartphones, Notebooks und ZubehÃ¶r. PersÃ¶nlich ausgewÃ¤hlte Highlights aus unserem Schweizer Sortiment."}
            </p>
          </div>
          <Link href="/produkte" className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-neutral-950 transition hover:bg-amber-200">
            Alle Technik entdecken
          </Link>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Gaming", "Smartphones", "Notebooks", "Monitore", "ZubehÃ¶r"].map((item) => (
            <span key={item} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200">{item}</span>
          ))}
        </div>
      </div>
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
          IUMATEC BLACK NOVEMBER Â· TOP AUSWAHL
        </p>
        <h2 className="mt-3 text-3xl font-black">
          {saleReady ? "Black Friday Â· Neun Technik-Angebote" : "Black Friday Â· Unsere Top-Auswahl"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-400">
          {saleReady
            ? "Die Aktionspreise werden beim HinzufÃ¼gen zum Warenkorb durch Shopify berechnet. Auf Produktdetailseiten kÃ¶nnen regulÃ¤re Preise erscheinen. Massgeblich ist der Preis im Checkout."
            : "Smartphones, Notebooks, Gaming, Monitore und ZubehÃ¶r â€“ gezielt ausgewÃ¤hlt aus unserem Schweizer Sortiment. Aktuelle Verkaufspreise gelten beim Produkt."}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
      <p className="mt-7 text-xs leading-6 text-neutral-400">
        {saleReady
          ? "Aktionspreise bis 30. November 2026, 23:59 Uhr. Kein Vergleich mit frÃ¼heren Preisen und keine pauschalen Rabatte. VerfÃ¼gbarkeit und Checkout-Preis massgeblich."
          : "Kuratierte Black-Friday-Auswahl, keine pauschalen Rabatte. Preisreduktionen werden nur nach bestÃ¤tigter Kalkulation und PrÃ¼fung des Shopify-Checkout-Preises separat ausgewiesen."}
      </p>
    </section>
  );
}