// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { shopifyFetch } from "@/lib/shopify";

type MoneyV2 = { amount: string; currencyCode: string };

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: string; // formatted string
  currencyCode: string;
  variantId: string | null;
};

type HomeCollection = {
  id: string;
  handle: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

function formatPrice(amount: string, currency: string) {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  return new Intl.NumberFormat("de-CH", { style: "currency", currency }).format(n);
}

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = /* GraphQL */ `
    query HomeLatestProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            featuredImage {
              url
              altText
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            variants(first: 1) {
              edges {
                node {
                  id
                }
              }
            }
          }
        }
      }
    }
  `;

  type Resp = {
    products: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          title: string;
          featuredImage: { url: string; altText: string | null } | null;
          priceRange: { minVariantPrice: MoneyV2 };
          variants: { edges: Array<{ node: { id: string } }> };
        };
      }>;
    };
  };

  const data = await shopifyFetch<Resp>({ query, variables: { first: limit } });

  return data.products.edges.map(({ node }) => {
    const min = node.priceRange.minVariantPrice;
    const variantId = node.variants.edges?.[0]?.node?.id ?? null;

    return {
      id: node.id,
      handle: node.handle,
      title: node.title,
      imageUrl: node.featuredImage?.url ?? null,
      imageAlt: node.featuredImage?.altText ?? node.title,
      price: formatPrice(min.amount, min.currencyCode),
      currencyCode: min.currencyCode,
      variantId,
    };
  });
}

async function getFeaturedCollections(limit = 4): Promise<HomeCollection[]> {
  const query = /* GraphQL */ `
    query HomeCollections($first: Int!) {
      collections(first: $first, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            handle
            title
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;

  type Resp = {
    collections: {
      edges: Array<{
        node: {
          id: string;
          handle: string;
          title: string;
          image: { url: string; altText: string | null } | null;
        };
      }>;
    };
  };

  const data = await shopifyFetch<Resp>({ query, variables: { first: limit } });

  return data.collections.edges.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    imageUrl: node.image?.url ?? null,
    imageAlt: node.image?.altText ?? node.title,
  }));
}

export default async function HomePage() {
  const [products, collections] = await Promise.all([
    getLatestProducts(8),
    getFeaturedCollections(4),
  ]);

  return (
    <main className="bg-white">
      {/* HERO */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-brand/15 via-white to-white" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 grid gap-10 md:grid-cols-2 items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-neutral-600 bg-white/70">
              <span className="h-2 w-2 rounded-full bg-brand" />
              Premium Tech Store Schweiz
            </p>

            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900">
              IUMATEC Schweiz — Tech, <span className="text-brand">schnell</span> & sicher.
            </h1>

            <p className="mt-4 text-neutral-600">
              Neuheiten, Bestseller und Zubehör — direkt bereit für deinen Warenkorb.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="rounded-xl bg-brand px-5 py-3 text-white text-sm font-semibold hover:bg-brand-dark transition"
              >
                Produkte ansehen
              </Link>
              <Link
                href="/collections"
                className="rounded-xl border border-neutral-300 px-5 py-3 text-sm font-semibold hover:bg-neutral-50 transition"
              >
                Kategorien
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-neutral-600">
              <div className="rounded-xl border bg-white/70 px-3 py-2">
                <span className="font-semibold text-neutral-900">24h</span> Support
              </div>
              <div className="rounded-xl border bg-white/70 px-3 py-2">
                <span className="font-semibold text-neutral-900">CH</span> Versand
              </div>
              <div className="rounded-xl border bg-white/70 px-3 py-2">
                <span className="font-semibold text-neutral-900">Secure</span> Checkout
              </div>
            </div>
          </div>

          <div className="rounded-3xl border bg-white/60 backdrop-blur p-3 shadow-sm">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-neutral-100">
              {/* Troca para a tua imagem (já tens no /public) */}
              <Image
                src="/hero-tech.png"
                alt="IUMATEC"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent" />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES / COLLECTIONS */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold text-neutral-900">Kategorien</h2>
          <Link href="/collections" className="text-sm text-brand hover:underline underline-offset-4">
            Alle ansehen
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {collections.map((c) => (
            <Link
              key={c.id}
              href={`/collections/${c.handle}`}
              className="group rounded-2xl border bg-white hover:shadow-sm transition overflow-hidden"
            >
              <div className="relative h-36 bg-neutral-100">
                {c.imageUrl ? (
                  <Image
                    src={c.imageUrl}
                    alt={c.imageAlt ?? c.title}
                    fill
                    className="object-cover group-hover:scale-[1.02] transition"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white to-neutral-100" />
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-neutral-900 group-hover:text-brand transition">
                  {c.title}
                </div>
                <div className="text-sm text-neutral-600">Entdecken</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* LATEST PRODUCTS */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold text-neutral-900">Neueste Produkte</h2>
          <Link href="/products" className="text-sm text-brand hover:underline underline-offset-4">
            Alle Produkte
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.handle}`}
              className="group rounded-2xl border bg-white hover:shadow-sm transition overflow-hidden"
            >
              <div className="relative aspect-square bg-neutral-100">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.imageAlt ?? p.title}
                    fill
                    className="object-contain p-6 group-hover:scale-[1.02] transition"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white to-neutral-100" />
                )}
              </div>

              <div className="p-4">
                <div className="line-clamp-2 font-semibold text-neutral-900 group-hover:text-brand transition">
                  {p.title}
                </div>
                <div className="mt-2 text-sm font-bold text-neutral-900">{p.price}</div>

                <div className="mt-3">
                  {p.variantId ? (
                    <AddToCartButton variantId={p.variantId} />
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full rounded-lg bg-neutral-200 px-4 py-2 text-neutral-600 text-sm"
                    >
                      Nicht verfügbar
                    </button>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
