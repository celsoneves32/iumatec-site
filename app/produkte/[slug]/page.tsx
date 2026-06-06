import ProductBuyButton from "@/components/ProductBuyButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
  type Product,
} from "@/lib/productData";

type Props = {
  params: { slug: string };
};

function getProductSlug(product: Product) {
  const p = product as any;
  return p.slug || p.shopifyProductHandle || "";
}

function getMerchandiseId(product: Product) {
  const p = product as any;
  return p.merchandiseId || p.shopifyVariantId || null;
}

function getStockQty(product: Product) {
  const p = product as any;
  return Number(p.stockQty ?? p.stock ?? 0);
}

function normalize(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .trim();
}

function getText(product: Product) {
  const p = product as any;

  return normalize(
    [
      p.title,
      p.brand,
      p.sku,
      p.category,
      p.subcategory,
      p.description,
      p.description2,
    ].join(" ")
  );
}

function getFamilyKey(product: Product) {
  const p = product as any;
  let title = normalize(p.title);

  title = title
    .replace(/\b(midnight|mitternacht|sky blue|sky-blue|silber|silver|schwarz|black|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grun|green|starlight|space schwarz|space black)\b/g, "")
    .replace(/\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64gb|128gb)\b/g, "")
    .replace(/\b(8 gb|16 gb|24 gb|32 gb|64 gb|128 gb)\b/g, "")
    .replace(/\b(wifi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/[,/()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${normalize(p.brand)}-${title}`;
}

function getVariantLabel(product: Product) {
  const p = product as any;
  const text = `${p.title || ""} ${p.description || ""} ${p.description2 || ""}`;

  const color =
    text.match(/(Midnight|Mitternacht|Sky Blue|Silber|Silver|Schwarz|Black|Grau|Gray|Grey|Blue|Blau|Gold|Starlight|Space Schwarz|Space Black)/i)?.[0] || null;

  const storage =
    text.match(/(128GB|256GB|512GB|1TB|2TB|4TB)/i)?.[0] || null;

  const ram =
    text.match(/(8 GB|16 GB|24 GB|32 GB|64 GB|128 GB|8GB|16GB|24GB|32GB|64GB|128GB)/i)?.[0] || null;

  const parts = [color, storage, ram]
    .filter(Boolean)
    .map((v) => String(v).replace(/(\d+)(GB)/i, "$1 GB"));

  return parts.length ? parts.join(" · ") : p.title;
}

function getVariantProducts(product: Product) {
  const currentKey = getFamilyKey(product);
  const currentSlug = getProductSlug(product);
  const allProducts = getAllProducts();

  const variants = allProducts
    .filter((item) => {
      const slug = getProductSlug(item);
      if (!slug) return false;

      const price = Number((item as any).price || 0);
      if (price <= 0) return false;

      return getFamilyKey(item) === currentKey;
    })
    .sort((a, b) => {
      const activeA = getProductSlug(a) === currentSlug ? -1 : 0;
      const activeB = getProductSlug(b) === currentSlug ? -1 : 0;
      if (activeA !== activeB) return activeA - activeB;

      return Number((a as any).price || 0) - Number((b as any).price || 0);
    });

  const seen = new Set<string>();

  return variants.filter((item) => {
    const slug = getProductSlug(item);
    if (seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

export default function ProductPage({ params }: Props) {
  const product = getProductBySlug(params.slug);

  if (!product) return notFound();

  const related = getRelatedProducts(
    product.slug,
    product.category,
    product.subcategory,
    4
  );

  const variantProducts = getVariantProducts(product);
  const stockQty = getStockQty(product);
  const inStock = stockQty > 0 || product.inStock;
  const price = Number((product as any).price || 0);

  const stockLabel =
    stockQty > 0 && stockQty <= 3
      ? `Nur noch ${stockQty} Stück`
      : inStock
        ? "Sofort lieferbar"
        : "Nicht verfügbar";

  const stockColor =
    stockQty > 0 && stockQty <= 3
      ? "text-orange-600"
      : inStock
        ? "text-green-600"
        : "text-neutral-400";

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex items-center justify-center rounded-3xl border bg-neutral-50 p-6">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="max-h-[480px] max-w-full object-contain"
              />
            ) : (
              <div className="text-neutral-400">Kein Bild</div>
            )}
          </div>

          <div>
            <div className="text-sm text-neutral-500">
              {product.brand || "IUMATEC"}
            </div>

            <h1 className="mt-2 text-3xl font-extrabold text-neutral-950">
              {product.title}
            </h1>

            <div className={`mt-3 text-sm font-bold ${stockColor}`}>
              {stockLabel}
            </div>

            <div className="mt-6 text-4xl font-extrabold text-neutral-950">
              CHF {price.toFixed(2)}
            </div>

            <div className="text-sm text-neutral-500">
              inkl. MWST · Versand Schweiz
            </div>

            {variantProducts.length > 1 && (
              <div className="mt-6 rounded-3xl border border-neutral-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-extrabold text-neutral-900">
                  Andere Varianten
                </h2>

                <div className="flex flex-wrap gap-2">
                  {variantProducts.map((item) => {
                    const slug = getProductSlug(item);
                    const active = slug === getProductSlug(product);

                    return (
                      <Link
                        key={slug}
                        href={`/produkte/${slug}`}
                        className={
                          active
                            ? "rounded-2xl border-2 border-red-600 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700"
                            : "rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm font-bold text-neutral-800 hover:border-neutral-900"
                        }
                      >
                        {getVariantLabel(item)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <ProductBuyButton
  merchandiseId={getMerchandiseId(product)}
  productHandle={(product as any).shopifyProductHandle ?? product.slug}
  imageUrl={product.image ?? null}
  disabled={!inStock}
/>

              <button className="rounded-2xl border px-6 py-4 font-bold hover:bg-neutral-100">
                ♥
              </button>
            </div>

            <div className="mt-6 space-y-2 text-sm text-neutral-600">
              <div>⚡ Lieferung 1–2 Werktage</div>
              <div>🛡️ Sicherer Checkout Shopify</div>
              <div>🇨🇭 Versand aus der Schweiz</div>
            </div>

            {(product.description || product.description2) && (
              <div className="mt-8 border-t pt-6">
                <h2 className="mb-3 text-lg font-bold">Beschreibung</h2>
                <p className="whitespace-pre-line text-sm text-neutral-700">
                  {product.description || product.description2}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <h2 className="mb-6 text-2xl font-extrabold">Ähnliche Produkte</h2>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {related.map((item) => (
              <ProductCard
                key={item.slug}
                product={{
                  slug: item.slug,
                  title: item.title,
                  brand: item.brand,
                  price: item.price,
                  image: item.image ?? null,
                  inStock: item.inStock,
                  stockQty: item.stockQty,
                  merchandiseId: getMerchandiseId(item),
                  productHandle: (item as any).shopifyProductHandle ?? item.slug,
                  energyLabel: (item as any).energyLabel,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}