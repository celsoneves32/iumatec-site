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
  descriptionText: string;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  price: number | null;
  currencyCode: string | null;
};

const SITE_URL = "https://iumatec.ch";

async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  // ✅ RECOMENDADO: Storefront (public) para front-end
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN; // iumatec-2.myshopify.com
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

  if (!domain || !token) {
    console.error("Missing Shopify Storefront env vars");
    return null;
  }

  const query = `
    query ProductByHandle($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        descriptionHtml
        description
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          edges {
            node {
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

  const res = await fetch(`https://${domain}/api/2024-04/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables: { handle } }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Shopify product error", await res.text());
    return null;
  }

  const json = await res.json();
  const product = json?.data?.productByHandle;
  if (!product) return null;

  const firstVariant = product.variants?.edges?.[0]?.node;
  const amount = firstVariant?.price?.amount ? Number(firstVariant.price.amount) : null;
  const currency = firstVariant?.price?.currencyCode ?? null;

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.descriptionHtml || "",
    descriptionText: (product.description || "").slice(0, 160),
    featuredImageUrl: product.featuredImage?.url ?? null,
    featuredImageAlt: product.featuredImage?.altText ?? null,
    price: amount,
    currencyCode: currency,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const handle = params.id;
  const product = await getProductByHandle(handle);

  if (!product) {
    return {
      title: "Produkt nicht gefunden",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.title} – IUMATEC`;
  const description =
    product.descriptionText ||
    "Elektronik & Technik zum besten Preis – schnelle Lieferung in der ganzen Schweiz.";

  const url = `${SITE_URL}/produkte/${product.handle}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "product",
      url,
      title,
      description,
      images: product.featuredImageUrl
        ? [{ url: product.featuredImageUrl, alt: product.featuredImageAlt || product.title }]
        : [{ url: "/opengraph-image.png", alt: "IUMATEC" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.featuredImageUrl ? [product.featuredImageUrl] : ["/opengraph-image.png"],
    },
  };
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
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
        <section className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-center justify-center">
          {product.featuredImageUrl ? (
            <div className="relative w-full max-w-md aspect-[4/5]">
              <Image
                src={product.featuredImageUrl}
                alt={product.featuredImageAlt || product.title}
                fill
                className="object-contain"
                sizes="(min-width: 1024px) 400px, 80vw"
              />
            </div>
          ) : (
            <div className="w-full max-w-md aspect-[4/5] flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-300 rounded-xl">
              Kein Produktbild verfügbar
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <header>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              {product.title}
            </h1>
            <p className="text-xs text-neutral-500">Artikel-Nr.: {product.handle}</p>
          </header>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <div className="text-2xl font-semibold text-neutral-900">{priceLabel}</div>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              inkl. MwSt., zzgl. Versand. Lieferung innerhalb der Schweiz und Liechtenstein.
            </p>

            {product.price != null ? (
              <AddToCartButton id={product.handle} title={product.title} price={product.price} />
            ) : (
              <p className="text-xs text-red-600">Für dieses Produkt ist kein Preis hinterlegt.</p>
            )}

            <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
              Die tatsächlichen Lieferzeiten können je nach Verfügbarkeit und Region leicht variieren.
              Alle Angaben ohne Gewähr.
            </p>
          </div>

          <article className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">Produktbeschreibung</h2>
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
