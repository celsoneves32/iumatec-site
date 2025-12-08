// app/produkte/[id]/page.tsx
import { notFound } from "next/navigation";
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
};

async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

  if (!domain || !token) {
    console.error("Missing Shopify env vars");
    return null;
  }

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
              price
              currencyCode
            }
          }
        }
      }
    }
  `;

  const res = await fetch(
    `https://${domain}/admin/api/${apiVersion}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({
        query,
        variables: { handle },
      }),
      // importante para não cachear produto
      cache: "no-store",
    }
  );

  if (!res.ok) {
    console.error("Shopify product error", await res.text());
    return null;
  }

  const json = await res.json();

  const product = json?.data?.productByHandle;
  if (!product) return null;

  const firstVariant = product.variants?.edges?.[0]?.node;

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    descriptionHtml: product.descriptionHtml || "",
    featuredImageUrl: product.featuredImage?.url ?? null,
    featuredImageAlt: product.featuredImage?.altText ?? null,
    price: firstVariant?.price ? Number(firstVariant.price) : null,
    currencyCode: firstVariant?.currencyCode ?? null,
  };
}

type ProductPageProps = {
  params: { id: string }; // aqui o [id] é o HANDLE do produto
};

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const handle = params.id;
  const product = await getProductByHandle(handle);

  if (!product) {
    notFound();
  }

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
            <p className="text-xs text-neutral-500">
              Artikel-Nr.: {product.handle}
            </p>
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

            {product.price != null ? (
              <AddToCartButton
                id={product.handle}
                title={product.title}
                price={product.price}
              />
            ) : (
              <p className="text-xs text-red-600">
                Für dieses Produkt ist kein Preis hinterlegt.
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
              dangerouslySetInnerHTML={{
                __html: product.descriptionHtml || "",
              }}
            />
          </article>
        </section>
      </div>
    </main>
  );
}
