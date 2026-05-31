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

function getFamilyKey(product: Product) {
  const p = product as any;

  return String(p.title || "")
    .toLowerCase()
    .replace(
      /\b(schwarz|black|midnight|sky blue|sky-blue|silber|silver|grau|gray|grey|blau|blue|weiss|white|gold|rose|rot|red|grün|green|starlight|space schwarz|space black)\b/g,
      ""
    )
    .replace(/\b(64gb|128gb|256gb|512gb|1tb|2tb|4tb|8gb|16gb|24gb|32gb|64gb|128gb)\b/g, "")
    .replace(/\b(wifi|wi-fi|5g|cellular|lte)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getVariantLabel(product: Product) {
  const p = product as any;
  const title = String(p.title || "");

  const parts = [];

  const color =
    title.match(
      /(Midnight|Sky Blue|Silber|Silver|Schwarz|Black|Grau|Gray|Blue|Blau|Gold|Starlight|Space Schwarz|Space Black)/i
    )?.[0] || null;

  const storage = title.match(/(128GB|256GB|512GB|1TB|2TB|4TB)/i)?.[0] || null;
  const ram = String(p.description || "").match(/(8 GB|16 GB|24 GB|32 GB|64 GB|128 GB)/i)?.[0] || null;

  if (color) parts.push(color);
  if (storage) parts.push(storage);
  if (ram) parts.push(ram);

  return parts.length ? parts.join(" · ") : title;
}

function getVariantProducts(product: Product) {
  const currentKey = getFamilyKey(product);
  const allProducts = getAllProducts();

  return allProducts
    .filter((item) => {
      const slug = getProductSlug(item);
      if (!slug) return false;
      if (slug === getProductSlug(product)) return true;

      return getFamilyKey(item) === currentKey;
    })
    .filter((item) => Number((item as any).price || 0) > 0)
    .slice(0, 12);
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

  let stockLabel = "";
  let stockColor = "";

  if (stockQty > 0 && stockQty <= 3) {
    stockLabel = `Nur noch ${stockQty} Stück`;
    stockColor = "text-orange-600";
  } else if (inStock) {
    stockLabel = "Sofort lieferbar";
    stockColor = "text-green-600";
  } else {
    stockLabel = "Nicht verfügbar";
    stockColor = "text-neutral-400";
  }

  return (
    <main className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="flex items-center justify-center rounded-3xl border bg-neutral-50 p-6">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="max-h-[400px] object-contain"
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
              {getMerchandiseId(product) && inStock ? (
                <button className="flex-1 rounded-2xl bg-red-600 py-4 text-lg font-extrabold text-white hover:bg-red-700">
                  In den Warenkorb
                </button>
              ) : (
                <button
                  disabled
                  className="flex-1 rounded-2xl bg-neutral-200 py-4 text-lg font-bold text-neutral-500"
                >
                  Nicht verfügbar
                </button>
              )}

              <button className="rounded-2xl border px-6 py-4 font-bold hover:bg-neutral-100">
                ♥
              </button>
            </div>

            <div className="mt-6 space-y-2 text-sm text-neutral-600">
              <div>⚡ Lieferung 1–2 Werktage</div>
              <div>🛡️ Sicherer Checkout (Shopify)</div>
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
          <h2 className="mb-6 text-2xl font-extrabold">
            Ähnliche Produkte
          </h2>

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