// app/produkte/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import AddToCartButton from "@/components/AddToCartButton";

type Money = { amount: string; currencyCode: string };

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  imageUrl: string | null;
  imageAlt: string | null;
  variantId: string | null;
  price: Money | null;
};

function getStorefrontEndpoint() {
  const domain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN;
  if (!domain) throw new Error("Missing NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN");
  return `https://${domain}/api/2024-04/graphql.json`;
}

function getStorefrontToken() {
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!token) throw new Error("Missing NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN");
  return token;
}

async function storefrontFetch<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const res = await fetch(getStorefrontEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": getStorefrontToken(),
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok || json.errors) {
    const msg =
      json?.errors?.[0]?.message ||
      (typeof json === "string" ? json : "Storefront request failed");
    throw new Error(msg);
  }
  return json.data as T;
}

async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const query = `
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

  const data = await storefrontFetch<{ productByHandle: any }>(query, { handle });
  const p = data?.productByHandle;
  if (!p) return null;

  const v = p?.variants?.edges?.[0]?.node ?? null;

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    descriptionHtml: p.descriptionHtml || "",
    imageUrl: p.featuredImage?.url ?? null,
    imageAlt: p.featuredImage?.altText ?? null,
    variantId: v?.id ?? null,
    price: v?.price ?? null,
  };
}

type ProductPageProps = {
  params: { id: string }; // [id] = handle
};

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const handle = params.id;
  const product = await getProductByHandle(handle);

  if (!product) notFound();

  const priceLabel =
    product.price != null
      ? `${Number(product.price.amount).toFixed(2)} ${product.price.currencyCode}`
      : "Preis auf Anfrage";

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        {/* Imagem principal */}
        <section className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col items-center justify-center">
          {product.imageUrl ? (
            <div className="relative w-full max-w-md aspect-[4/5]">
              <Image
                src={product.imageUrl}
                alt={product.imageAlt || product.title}
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
              <div className="text-2xl font-semibold text-neutral-900">{priceLabel}</div>
            </div>

            <p className="text-xs text-neutral-500 mb-4">
              inkl. MwSt., zzgl. Versand. Lieferung innerhalb der Schweiz und Liechtenstein.
            </p>

            {product.variantId ? (
              <AddToCartButton variantId={product.variantId} />
            ) : (
              <p className="text-xs text-red-600">Für dieses Produkt ist keine Variant-ID verfügbar.</p>
            )}

            <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
              Die tatsächlichen Lieferzeiten können je nach Verfügbarkeit und Region leicht variieren.
              Alle Angaben ohne Gewähr.
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
