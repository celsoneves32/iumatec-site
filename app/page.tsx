// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import NewsletterSignup from "@/components/NewsletterSignup";

type HomeProduct = {
  id: string;
  handle: string;
  title: string;
  price: number;
  currencyCode: string;
  imageUrl: string | null;
  imageAlt: string | null;
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
  const apiVersion = process.env.SHOPIFY_ADMIN_API_VERSION || "2024-04";

  if (!domain || !token) {
    console.error("Missing Shopify env vars for home page");
    return [];
  }

  const url = `https://${domain}/admin/api/${apiVersion}/graphql.json`;

  // ⚠️ Mantém a tua query se já tinhas uma melhor.
  // Aqui vai uma versão que tenta obter featuredImage e preço do 1º variant.
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
                  presentmentPrices(first: 1) {
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
            }
          }
        }
      }
    }
  `;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables: { first: limit } }),
      next: { revalidate: 60 },
    });

    const json = await res.json();
    const edges = json?.data?.products?.edges ?? [];

    return edges.map((e: any) => {
      const node = e.node;
      const featured = node.featuredImage;

      const priceNode =
        node.variants?.edges?.[0]?.node?.presentmentPrices?.edges?.[0]?.node
          ?.price;

      const amount = priceNode?.amount ? Number(priceNode.amount) : 0;
      const currencyCode = priceNode?.currencyCode ?? "CHF";

      return {
        id: node.id,
        handle: node.handle,
        title: node.title,
        price: amount,
        currencyCode,
        imageUrl: featured?.url ?? null,
        imageAlt: featured?.altText ?? node.title ?? null,
      };
    });
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
          <Image
            src="/hero.jpg"
            alt="IUMATEC"
            fill
            className="object-cover"
            priority
          />
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
              Verifica as env vars do Shopify no deploy e/ou a query GraphQL.
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

                  {/* ✅ CORRIGIDO: props reais do AddToCartButton */}
                  <AddToCartButton id={p.id} title={p.title} price={p.price} />
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
