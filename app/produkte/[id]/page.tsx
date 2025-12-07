// app/produkte/[id]/page.tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";

type ShopifyProduct = {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  gallery: { id: string; url: string; altText: string | null }[];
  minPrice: number | null;
  currencyCode: string | null;
};

async function getProductByHandle(
  handle: string
): Promise<ShopifyProduct | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

  if (!domain || !token) {
    console.error("Shopify Admin Env fehlt");
    return null;
  }

  const endpoint = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

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
        images(first: 8) {
          edges {
            node {
              id
              url
              altText
            }
          }
        }
        priceRangeV2 {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  `;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({
      query,
      variables: { handle },
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("Shopify Admin Response not OK", await res.text());
    return null;
  }

  const json = await res.json();

  if (json.errors) {
    console.error("Shopify Admin GraphQL errors", json.errors);
    return null;
  }

  const p = json.data?.productByHandle;
  if (!p) return null;

  const minVariant = p.priceRangeV2?.minVariantPrice;

  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    descriptionHtml: p.descriptionHtml ?? null,
    featuredImageUrl: p.featuredImage?.url ?? null,
    featuredImageAlt: p.featuredImage?.altText ?? null,
    gallery:
      p.images?.edges?.map((e: any) => ({
        id: e.node.id,
        url: e.node.url,
        altText: e.node.altText ?? null,
      })) ?? [],
    minPrice: minVariant?.amount ? Number(minVariant.amount) : null,
    currencyCode: minVariant?.currencyCode ?? null,
  };
}

type ProductPageProps = {
  params: {
    id: string; // aqui usamos "id" como HANDLE do produto Shopify
  };
};

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const handle = params.id;

  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

  const priceDisplay =
    product.minPrice != null && product.currencyCode
      ? `${product.minPrice.toFixed(2)} ${product.currencyCode}`
      : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-neutral-500">
        <Link href="/" className="hover:text-red-600">
          Startseite
        </Link>{" "}
        <span className="mx-1">/</span>
        <Link href="/produkte" className="hover:text-red-600">
          Produkte
        </Link>{" "}
        <span className="mx-1">/</span>
        <span className="text-neutral-700">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr),minmax(0,1fr)]">
        {/* Bild / Galerie */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 flex flex-col gap-4">
          <div className="relative w-full max-w-md mx-auto aspect-[4/5] bg-neutral-50 rounded-xl">
            {product.featuredImageUrl ? (
              <Image
                src={product.featuredImageUrl}
                alt={product.featuredImageAlt || product.title}
                fill
                className="object-contain p-4"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
                Kein Produktbild
              </div>
            )}
          </div>

          {product.gallery.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.gallery.slice(0, 4).map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square bg-neutral-50 rounded-lg overflow-hidden"
                >
                  <Image
                    src={img.url}
                    alt={img.altText || product.title}
                    fill
                    className="object-contain p-2"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infos / Preis / Kaufen */}
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">
              {product.title}
            </h1>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            {priceDisplay && (
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="text-2xl font-semibold text-neutral-900">
                  {priceDisplay}
                </div>
              </div>
            )}
            <p className="text-xs text-neutral-500 mb-4">
              inkl. MwSt., zzgl. Versand. Lieferung nur innerhalb der Schweiz
              und Liechtenstein.
            </p>

            {product.minPrice != null ? (
              <AddToCartButton
                id={product.id}
                title={product.title}
                price={product.minPrice}
              />
            ) : (
              <div className="text-sm text-red-600">
                Preisinformationen sind derzeit nicht verfügbar.
              </div>
            )}

            <p className="mt-3 text-[11px] text-neutral-500 leading-snug">
              Die tatsächlichen Lieferzeiten können je nach Verfügbarkeit und
              Region leicht variieren. Alle Angaben ohne Gewähr.
            </p>
          </div>

          <div className="bg-white border border-neutral-200 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">
              Produktbeschreibung
            </h2>
            {product.descriptionHtml ? (
              <div
                className="prose prose-sm max-w-none prose-p:mb-2 prose-ul:list-disc prose-ul:pl-5 prose-li:mb-1"
                dangerouslySetInnerHTML={{
                  __html: product.descriptionHtml,
                }}
              />
            ) : (
              <p className="text-xs text-neutral-600">
                Für dieses Produkt liegt noch keine detaillierte Beschreibung
                vor.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
