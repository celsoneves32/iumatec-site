import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  getProductBySlug,
  getRelatedProducts,
} from "@/lib/productData";

type Props = {
  params: { slug: string };
};

export default function ProductPage({ params }: Props) {
  const product = getProductBySlug(params.slug);

  if (!product) return notFound();

  const related = getRelatedProducts(
    product.slug,
    product.category,
    product.subcategory,
    4
  );

  const inStock = (product.stockQty ?? 0) > 0 || product.inStock;

  let stockLabel = "";
  let stockColor = "";

  if ((product.stockQty ?? 0) <= 3) {
    stockLabel = "Nur noch wenige auf Lager!";
    stockColor = "text-orange-600";
  } else if ((product.stockQty ?? 0) > 0) {
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
          {/* IMAGEM */}
          <div className="rounded-3xl border bg-neutral-50 p-6 flex items-center justify-center">
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

          {/* INFO */}
          <div>
            <div className="text-sm text-neutral-500">
              {product.brand || "IUMATEC"}
            </div>

            <h1 className="mt-2 text-3xl font-extrabold text-neutral-950">
              {product.title}
            </h1>

            {/* 🔥 STOCK */}
            <div className={`mt-3 text-sm font-bold ${stockColor}`}>
              {stockLabel}
            </div>

            {/* 🔥 PREÇO GRANDE */}
            <div className="mt-6 text-4xl font-extrabold text-neutral-950">
              CHF {product.price.toFixed(2)}
            </div>

            <div className="text-sm text-neutral-500">
              inkl. MWST · Versand Schweiz
            </div>

            {/* 🔥 CTA PRINCIPAL */}
            <div className="mt-6 flex gap-3">
              {product.merchandiseId ? (
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

            {/* 🔥 TRUST */}
            <div className="mt-6 space-y-2 text-sm text-neutral-600">
              <div>⚡ Lieferung 1–2 Werktage</div>
              <div>🛡️ Sicherer Checkout (Shopify)</div>
              <div>🇨🇭 Versand aus der Schweiz</div>
            </div>

            {/* DESCRIÇÃO */}
            {(product.description || product.description2) && (
              <div className="mt-8 border-t pt-6">
                <h2 className="text-lg font-bold mb-3">Beschreibung</h2>
                <p className="text-sm text-neutral-700 whitespace-pre-line">
                  {product.description || product.description2}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 🔥 PRODUTOS RELACIONADOS */}
      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-16">
          <h2 className="text-2xl font-extrabold mb-6">
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
                  merchandiseId: item.merchandiseId,
                  productHandle: item.shopifyProductHandle ?? item.slug,
                  energyLabel: item.energyLabel,
                }}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}