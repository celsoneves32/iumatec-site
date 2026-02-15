// app/produkte/[id]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  price: number | null;
  currencyCode: string | null;
  variantId: string | null; // ✅ Storefront variant id
};

function getStorefrontConfig() {
  const domain =
    process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ||
    process.env.SHOPIFY_STORE_DOMAIN;

  const token =
    process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN ||
    process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    throw new Error(
      "Missing Shopify Storefront env vars. Set NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN and NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN."
    );
  }

  return { domain, token };
}

async function storefrontFetch<T>(query: string, variables: Record<string, any>) {
  const { domain, token } = getStorefrontConfig();

  const res = await fetch(`https://${domain}/api/2024-07/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error("Storefront error", txt);
    throw new Error("Storefront request failed");
  }

  return (await res.json()) as T;
}

async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = /* GraphQL */ `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          edges {
            node {
              id
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `;

  type Resp = {
    data?: {
      productByHandle?: {
        id: string;
        title: string;
        handle: string;
        descriptionHtml?: string | null;
        featuredImage?: { url: string; altText?: string | null } | null;
        variants?: {
          edges: Array<{
            node: {
              id: string;
              price?: { amount: string; currencyCode: string } | null;
            };
          }>;
        } | null;
      } | null;
    };
    errors?: any;
  };

  const json = await storefrontFetch<Resp>(query, { handle });

  const p = json?.data?.productByHandle;
  if (!p) return null;

  const firstVariant = p.variants?.edges?.[0]?.node ?? null;

  const amount = firstVariant?.price?.amount
    ? Number(firstVariant.price.amount)
    : null;

  const currency = firstVariant?.price?.currencyCode ?? null;

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    descriptionHtml: p.descriptionHtml || "",
    featuredImageUrl: p.featuredImage?.url ?? null,
    featuredImageAlt: p.featuredImage?.altText ?? null,
    variantId: firstVariant?.id ?? null,
    price: amount,
    currencyCode: currency,
  };
}

// ✅ SEO por produto
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const handle = params.id;
  const product = await getProductByHandle(handle);

  if (!product) return { title: "Produkt nicht gefunden | IUMATEC" };

  const title = `${product.title} | IUMATEC`;
  const description =
    "Premium Tech Store Schweiz – schnelle Lieferung, sichere Bezahlung und Schweizer Support.";

  return {
    title,
    description,
    alternates: {
      canonical: `/produkte/${product.handle}`,
    },
    openGraph: {
      title,
      description,
      images: product.featuredImageUrl
        ? [{ url: product.featuredImageUrl }]
        : [{ url: "/opengraph-image.png" }],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const handle = params.id;
  const product = await getProductByHandle(handle);

  if (!product) notFound();

  const priceLabel =
    product.price != null
      ? `${product.price.toFixed(2)} ${product.currencyCode || "CHF"}`
      : "Preis auf Anfrage";

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        {/* Imagem principal */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-center justify-center">
          {product.featuredImageUrl ? (
            <div className="relative w-full max-w-md aspect-[4/5]">
              <Image
                src={product.featuredImageUrl}
                alt={product.featuredImageAlt || product.title}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 400px, 80vw"
                priority
              />
            </div>
          ) : (
            <div className="w-full max-w-md aspect-[4/5] flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-300 rounded-xl">
              Kein Produktbild verfügbar
            </div>
          )}
        </section>

        {/* Infos / Kaufen */}
        <section className="flex flex-col gap-4">
          <header>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              {product.title}
            </h1>
            <p className="text-xs text-neutral-500">Artikel-Nr.: {product.handle}</p>
          </header>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="text-2xl font-semibold text-neutral-900">
                {priceLabel}
              </div>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              inkl. MwSt., zzgl. Versand. Lieferung innerhalb der Schweiz und
              Liechtenstein.
            </p>

            {/* ✅ AddToCart precisa variantId real */}
            {product.variantId ? (
              <AddToCartButton
                variantId={product.variantId}
                productName={product.title}
                price={product.price ?? undefined}
                currency={product.currencyCode ?? "CHF"}
              />
            ) : (
              <p className="text-xs text-red-600">
                Für dieses Produkt ist kein Variant hinterlegt.
              </p>
            )}

            <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
              Die tatsächlichen Lieferzeiten können je nach Verfügbarkeit und
              Region leicht variieren. Alle Angaben ohne Gewähr.
            </p>
          </div>

          <article className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">
              Produktbeschreibung
            </h2>
            <div
              className="prose prose-sm max-w-none text-neutral-800 prose-p:mb-2 prose-ul:list-disc prose-ul:pl-5"
              dangerouslySetInnerHTML={{ __html: product.descriptionHtml || "" }}
            />
          </article>
        </section>
      </div>
    </main>
  );
}
