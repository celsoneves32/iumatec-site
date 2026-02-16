// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import NewsletterSignup from "@/components/NewsletterSignup";
import { shopifyFetch } from "@/lib/shopify";

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
  variantId: string;
};

type ProductsQuery = {
  products: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
        featuredImage: { url: string; altText: string | null } | null;
        variants: {
          edges: Array<{
            node: {
              id: string;
              price: { amount: string; currencyCode: string };
            };
          }>;
        };
      };
    }>;
  };
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = `
    query Products($first: Int!) {
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
      }
    }
  `;

  try {
    const data = await shopifyFetch<ProductsQuery>({
      query,
      variables: { first: limit },
      cache: "force-cache",
    });

    const edges = data?.products?.edges ?? [];

    return edges
      .map((e) => {
        const node = e.node;
        const variant = node.variants?.edges?.[0]?.node;
        if (!variant?.id) return null;

        const featured = node.featuredImage;

        const amount = variant.price?.amount ? Number(variant.price.amount) : 0;
        const currency = variant.price?.currencyCode ?? "CHF";

        return {
          id: node.id,
          handle: node.handle,
          title: node.title,
          variantId: variant.id,
          price: amount,
          currencyCode: currency,
          imageUrl: featured?.url ?? null,
          imageAlt: featured?.altText ?? node.title ?? null,
        } as HomeProduct;
      })
      .filter((p): p is HomeProduct => Boolean(p));
  } catch (err) {
    console.error("getLatestProducts error:", err);
    return [];
  }
}

const categories = [
  { title: "Smartphones", href: "/collections/smartphones" },
  { title: "Laptops", href: "/collections/laptops" },
  { title: "Acessórios", href: "/collections/accessories" },
  { title: "Gaming", href: "/collections/gaming" },
];

function Price({ value, currency }: { value: number; currency: string }) {
  const formatted = new Intl.NumberFormat("de-CH", {
    style: "currency",
    currency,
  }).format(value);

  return <span>{formatted}</span>;
}

export default async function HomePage() {
  const products = await getLatestProducts(8);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-12">
      {/* HERO */}
      <section className="grid gap-6 md:grid-cols-2 items-center">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold">
            IUMATEC Schweiz — Tech, schnell & sicher.
          </h1>
          <p className="text-neutral-600">
            Neuheiten, Bestseller und Zubehör — direkt bereit für deinen Warenkorb.
          </p>
          <div className="flex gap-3">
            <Link
              href="/products"
              className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-2 text-white"
            >
              Produkte ansehen
            </Link>
            <Link
              href="/collections"
              className="inline-flex items-center justify-center rounded-lg border px-4 py-2"
            >
              Kategorien
            </Link>
          </div>
        </div>

        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-neutral-100">
          <Image src="/hero.jpg" alt="IUMATEC" fill className="object-cover" priority />
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Kategorien</h2>
          <Link href="/collections" className="text-sm underline">
            Alle ansehen
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border p-4 hover:bg-neutral-50 transition"
            >
              <div className="font-medium">{c.title}</div>
              <div className="text-sm text-neutral-600">Entdecken</div>
            </Link>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-xl font-semibold">Neueste Produkte</h2>
          <Link href="/products" className="text-sm underline">
            Alle Produkte
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border p-6 text-neutral-700">
            <div className="font-medium">Nenhum produto para mostrar.</div>
            <div className="text-sm text-neutral-600">
              Verifica o Storefront token e se há produtos publicados no Shopify.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => (
              <div key={p.id} className="rounded-2xl border overflow-hidden">
                <Link href={`/products/${p.handle}`} className="block">
                  <div className="relative aspect-square bg-neutral-100">
                    {p.imageUrl ? (
                      <Image
                        src={p.imageUrl}
                        alt={p.imageAlt ?? p.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-sm text-neutral-500">
                        Sem imagem
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-3 space-y-2">
                  <Link href={`/products/${p.handle}`} className="block">
                    <div className="font-medium line-clamp-2">{p.title}</div>
                  </Link>

                  <div className="text-sm text-neutral-700">
                    <Price value={p.price} currency={p.currencyCode} />
                  </div>

                  {/* ✅ aqui é variantId (Shopify Cart/Checkout usa variant) */}
                  <AddToCartButton variantId={p.variantId} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* NEWSLETTER */}
      <section className="rounded-2xl border p-6">
        <NewsletterSignup />
      </section>
    </main>
  );
}
