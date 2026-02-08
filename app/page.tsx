// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { shopifyFetch } from "@/lib/shopify";

type HomeProduct = {
  id: string;
  title: string;
  handle: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: number;
  currencyCode: string;
  variantId: string;
};

async function getLatestProducts(limit = 8): Promise<HomeProduct[]> {
  const query = `
    query LatestProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
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

  const data = await shopifyFetch<any>({
    query,
    variables: { first: limit },
    cache: "no-store",
  });

  return data.products.edges.map((e: any) => {
    const p = e.node;
    const variant = p.variants.edges[0].node;

    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      imageUrl: p.featuredImage?.url ?? null,
      imageAlt: p.featuredImage?.altText ?? p.title,
      price: Number(variant.price.amount),
      currencyCode: variant.price.currencyCode,
      variantId: variant.id,
    };
  });
}

function Price({ value, currency }: { value: number; currency: string }) {
  return (
    <span>
      {new Intl.NumberFormat("de-CH", {
        style: "currency",
        currency,
      }).format(value)}
    </span>
  );
}

export default async function HomePage() {
  const products = await getLatestProducts(8);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-14">
      {/* HERO */}
      <section className="grid gap-6 md:grid-cols-2 items-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold">
            IUMATEC Schweiz — Tech, schnell & sicher.
          </h1>
          <p className="text-neutral-600">
            Neuheiten, Bestseller und Zubehör — direkt vom Hersteller.
          </p>
          <Link
            href="/products"
            className="inline-block rounded-lg bg-black px-5 py-3 text-white"
          >
            Produkte ansehen
          </Link>
        </div>

        <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100">
          <Image
            src="/hero.jpg"
            alt="IUMATEC"
            fill
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* PRODUTOS */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Neueste Produkte</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border overflow-hidden">
              <Link href={`/products/${p.handle}`}>
                <div className="relative aspect-square bg-neutral-100">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.imageAlt ?? p.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
                      Sem imagem
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-3 space-y-2">
                <div className="font-medium line-clamp-2">{p.title}</div>
                <div className="text-sm">
                  <Price value={p.price} currency={p.currencyCode} />
                </div>

                <AddToCartButton
                  variantId={p.variantId}
                  quantity={1}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
