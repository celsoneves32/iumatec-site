import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductActions from "@/components/ProductActions";
import ProductDatasheetButton from "@/components/ProductDatasheetButton";
import ProductImageGallery from "@/components/ProductImageGallery";
import ProductSpecTable from "@/components/ProductSpecTable";
import { formatPriceCH } from "@/lib/formatPrice";
import { getProductReviews } from "@/lib/reviews";
import {
  getAllProductSlugs,
  getProductBySlug,
  getRelatedProducts,
  type Product,
} from "@/lib/productData";
import { getStockStatus } from "@/lib/stock";

type PageProps = {
  params: { slug: string };
};

function isValidMerchandiseId(value?: string | null) {
  return (
    typeof value === "string" &&
    value.trim().startsWith("gid://shopify/ProductVariant/")
  );
}

function isCommerciallyPurchasable(product: Product) {
  return isValidMerchandiseId(product.merchandiseId);
}

function isCommerciallyAvailable(product: Product) {
  return Boolean((product.stockQty ?? 0) > 0 || product.inStock);
}

function getCommercialRelatedProducts(product: Product, limit = 4) {
  return getRelatedProducts(product.slug, product.category, 20)
    .filter((item) => item.slug !== product.slug)
    .filter((item) => isCommerciallyPurchasable(item))
    .filter((item) => isCommerciallyAvailable(item))
    .slice(0, limit);
}

function getDeliveryInfo(product: Product) {
  const stockQty = product.stockQty ?? 0;

  if (!product.inStock || stockQty <= 0) {
    return {
      headline: "Aktuell nicht verfügbar",
      detail: "Derzeit nicht bestellbar",
      dot: "bg-neutral-300",
      textClass: "text-neutral-500",
      boxClass: "bg-neutral-50 border-neutral-200",
      urgency: null,
    };
  }

  if (stockQty >= 20) {
    return {
      headline: "Sofort lieferbar",
      detail: "Lieferung morgen / 1–2 Werktage",
      dot: "bg-green-500",
      textClass: "text-green-700",
      boxClass: "bg-green-50 border-green-100",
      urgency: "Schneller Versand aus CH-Lager",
    };
  }

  if (stockQty >= 6) {
    return {
      headline: "Lieferbar",
      detail: "Lieferung in 2–3 Werktagen",
      dot: "bg-green-500",
      textClass: "text-green-700",
      boxClass: "bg-green-50 border-green-100",
      urgency: "Begrenzter Bestand verfügbar",
    };
  }

  return {
    headline: `Nur noch ${stockQty} Stück verfügbar`,
    detail: "Lieferung in 3–5 Werktagen",
    dot: "bg-amber-500",
    textClass: "text-amber-700",
    boxClass: "bg-amber-50 border-amber-100",
    urgency: "Begrenzter Lagerbestand",
  };
}

export function generateStaticParams() {
  return getAllProductSlugs()
    .slice(0, 12000)
    .map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const product = getProductBySlug(params.slug);

  if (!product) {
    return { title: "Produkt nicht gefunden | IUMATEC Schweiz" };
  }

  const description =
    product.description ||
    product.description2 ||
    `${product.title} online kaufen bei IUMATEC Schweiz.`;

  return {
    title: `${product.title} | IUMATEC Schweiz`,
    description,
    openGraph: {
      title: `${product.title} | IUMATEC Schweiz`,
      description,
      images: product.image ? [product.image] : [],
      type: "website",
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const product = getProductBySlug(params.slug);

  if (!product) notFound();

  const reviews = await getProductReviews(product.slug);
  const stock = getStockStatus(product);
  const delivery = getDeliveryInfo(product);
  const relatedProducts = getCommercialRelatedProducts(product, 4);

  const priceValue = Number(product.price || 0);
  const mwstRate = 0.081;
  const mwstIncluded =
    priceValue > 0 ? priceValue - priceValue / (1 + mwstRate) : 0;

  const canAddToCart = isCommerciallyPurchasable(product);
  const hasStock = isCommerciallyAvailable(product);

  const specs = [
    { label: "Marke", value: product.brand || "" },
    { label: "SKU", value: product.sku || "" },
    { label: "EAN", value: product.ean || "" },
    { label: "Interne Nummer", value: product.internalNumber || "" },
    { label: "Kategorie", value: product.category || "" },
    { label: "Unterkategorie", value: product.subcategory || "" },
    { label: "Verfügbarkeit", value: stock.label || "" },
    { label: "Lieferung", value: delivery.detail || "" },
  ].filter((item) => item.value && String(item.value).trim() !== "");

  const description =
    product.description ||
    product.description2 ||
    `${product.title} online kaufen bei IUMATEC Schweiz.`;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image ? [product.image] : [],
    description,
    sku: product.sku,
    brand: product.brand
      ? { "@type": "Brand", name: product.brand }
      : undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "CHF",
      price: product.price,
      availability:
        canAddToCart && hasStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `/produkte/${product.slug}`,
    },
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <section className="mx-auto max-w-7xl px-4 py-8">
        <nav className="mb-8 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-500">
          <Link href="/" className="transition hover:text-neutral-900">
            Startseite
          </Link>
          <span>/</span>
          <Link href="/produkte" className="transition hover:text-neutral-900">
            Produkte
          </Link>
          {product.category ? (
            <>
              <span>/</span>
              <Link
                href={`/produkte?category=${encodeURIComponent(product.category)}`}
                className="transition hover:text-neutral-900"
              >
                {product.category}
              </Link>
            </>
          ) : null}
          <span>/</span>
          <span className="text-neutral-900">{product.title}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm md:p-6">
              <ProductImageGallery
                title={product.title}
                images={
                  product.images?.length
                    ? product.images
                    : product.image
                    ? [product.image]
                    : []
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-2xl">🇨🇭</div>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  Versand Schweiz
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Schnelle Lieferung aus CH-Lager.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-2xl">🔒</div>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  Sicher bezahlen
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Geschützter Checkout via Shopify.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5">
                <div className="text-2xl">↩️</div>
                <p className="mt-2 text-sm font-bold text-neutral-950">
                  14 Tage Rückgabe
                </p>
                <p className="mt-1 text-sm text-neutral-600">
                  Faire Rückgabe nach Schweizer Standard.
                </p>
              </div>
            </div>

            {(product.description || product.description2) && (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                  Produktbeschreibung
                </h2>
                {product.description ? (
                  <p className="mt-5 text-base leading-8 text-neutral-700">
                    {product.description}
                  </p>
                ) : null}
                {product.description2 ? (
                  <p className="mt-5 text-base leading-8 text-neutral-700">
                    {product.description2}
                  </p>
                ) : null}
              </div>
            )}

            {reviews.length > 0 ? (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                      Kundenbewertungen
                    </h2>
                    <p className="mt-2 text-sm text-neutral-500">
                      Kundenmeinungen zu diesem Produkt.
                    </p>
                  </div>
                  <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                    ★ {reviews.length} Bewertung
                    {reviews.length === 1 ? "" : "en"}
                  </div>
                </div>

                <div className="mt-6 space-y-5">
                  {reviews.map((review, index) => (
                    <div
                      key={`${review.productSlug}-${index}`}
                      className="border-b border-neutral-200 pb-5 last:border-0 last:pb-0"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-neutral-950">
                          {review.name}
                        </span>

                        <span className="text-amber-500">
                          {"★".repeat(review.rating)}
                        </span>

                        {review.verified ? (
                          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-bold text-green-700">
                            Verifiziert
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-neutral-700">
                        {review.text}
                      </p>
                      <p className="mt-2 text-xs text-neutral-400">
                        {review.date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
                <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                  Kundenbewertungen
                </h2>
                <p className="mt-3 text-sm text-neutral-500">
                  Für dieses Produkt gibt es noch keine Bewertungen.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-neutral-200 bg-white p-6 md:p-8">
              <h2 className="text-2xl font-bold tracking-tight text-neutral-950">
                Produktdetails
              </h2>
              <div className="mt-6">
                <ProductSpecTable specs={specs} />
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                {product.brand ? (
                  <span className="inline-flex rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700">
                    {product.brand}
                  </span>
                ) : null}

                <span
                  className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${stock.badgeClass}`}
                >
                  {stock.label}
                </span>
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-neutral-950 md:text-5xl">
                {product.title}
              </h1>

              <p className="mt-4 text-lg text-neutral-500">
                {[product.category, product.subcategory]
                  .filter(Boolean)
                  .join(" / ")}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-700">
                  Neu im Sortiment
                </div>
                <div className="text-sm font-medium text-neutral-500">
                  Bewertungen nach Kauf möglich
                </div>
              </div>

              <div className="mt-8 text-5xl font-extrabold tracking-tight text-neutral-950">
                {formatPriceCH(product.price)}
              </div>

              <div className="mt-2 text-base text-neutral-500">inkl. MWST</div>

              <div className="mt-2 text-sm text-neutral-500">
                Enthaltene MWST (8.1%): {formatPriceCH(mwstIncluded)}
              </div>

              <div
                className={`mt-6 rounded-3xl border p-5 ${delivery.boxClass}`}
              >
                <div
                  className={`flex items-center gap-2 text-lg font-extrabold ${delivery.textClass}`}
                >
                  <span className={`h-3 w-3 rounded-full ${delivery.dot}`} />
                  {delivery.headline}
                </div>
                <p className="mt-2 text-sm font-medium text-neutral-600">
                  {delivery.detail}
                </p>
                {delivery.urgency ? (
                  <p className="mt-3 text-sm font-bold text-neutral-800">
                    {delivery.urgency}
                  </p>
                ) : null}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-neutral-50 px-4 py-4">
                  <p className="text-sm font-bold text-neutral-950">Bestand</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {(product.stockQty ?? 0) > 0
                      ? `${product.stockQty} Stück verfügbar`
                      : stock.label}
                  </p>
                </div>

                <div className="rounded-2xl bg-neutral-50 px-4 py-4">
                  <p className="text-sm font-bold text-neutral-950">Checkout</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    Sicher via Shopify
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <ProductActions
                  product={{
                    merchandiseId: product.merchandiseId,
                    sku: product.sku,
                    slug: product.slug,
                    title: product.title,
                    price: product.price || 0,
                    image: product.image,
                    brand: product.brand,
                    inStock: product.inStock,
                    stockQty: product.stockQty,
                  }}
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <ProductDatasheetButton slug={product.slug} />

                <Link
                  href={`/produkte/${product.slug}/datenblatt`}
                  className="inline-flex rounded-2xl border border-neutral-300 bg-white px-6 py-4 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
                >
                  Datenblatt ansehen
                </Link>

                <Link
                  href={`/review?product=${product.slug}`}
                  className="inline-flex rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-bold text-red-700 transition hover:bg-red-100"
                >
                  Bewertung schreiben
                </Link>
              </div>

              <div className="mt-8 grid gap-3">
                <div className="rounded-2xl border border-neutral-200 px-4 py-4 text-sm font-semibold text-neutral-700">
                  🇨🇭 Versand in der Schweiz
                </div>
                <div className="rounded-2xl border border-neutral-200 px-4 py-4 text-sm font-semibold text-neutral-700">
                  🔒 Sichere Zahlung mit verschlüsseltem Checkout
                </div>
                <div className="rounded-2xl border border-neutral-200 px-4 py-4 text-sm font-semibold text-neutral-700">
                  💰 Transparente Preise inkl. MWST
                </div>
                <div className="rounded-2xl border border-neutral-200 px-4 py-4 text-sm font-semibold text-neutral-700">
                  📦 Lieferung mit Sendungsverfolgung
                </div>
              </div>
            </div>
          </aside>
        </div>

        {relatedProducts.length > 0 ? (
          <section className="mt-14">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-neutral-950">
                  Ähnliche Produkte
                </h2>
                <p className="mt-2 text-neutral-600">
                  Weitere direkt bestellbare Produkte aus derselben Kategorie.
                </p>
              </div>
              <Link
                href="/produkte"
                className="text-sm font-semibold text-red-600 underline-offset-4 hover:underline"
              >
                Alle Produkte ansehen
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((item) => (
                <ProductCard
                  key={`${item.sku}-${item.slug}`}
                  product={{
                    slug: item.slug,
                    title: item.title,
                    brand: item.brand,
                    price: item.price,
                    image: item.image ?? null,
                    stockQty: item.stockQty,
                    inStock: item.inStock,
                    merchandiseId: item.merchandiseId ?? null,
                    productHandle: item.shopifyProductHandle ?? item.slug,
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}