// app/produkte/page.tsx
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "@/components/AddToCartButton";
import { shopifyFetch } from "@/lib/shopify";

type Product = {
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

async function getProducts(): Promise<Product[]> {
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
      variables: { first: 24 },
      cache: "force-cache",
    });

    const edges = data?.products?.edges ?? [];

    return edges
      .map((e) => {
        const node = e.node;
        const variant = node.variants?.edges?.[0]?.node;
        if (!variant?.id) return null;

        return {
          id: node.id,
          handle: node.handle,
          title: node.title,
          variantId: variant.id,
          price: variant.price?.amount ? Number(variant.price.amount) : 0,
          currencyCode: variant.price?.currencyCode ?? "CHF",
          imageUrl: node.featuredImage?.url ?? null,
          imageAlt: node.featuredImage?.altText ?? node.title ?? null,
        } as Product;
      })
      .filter((p): p is Product => Boolean(p));
  } catch (err) {
    console.error("getProducts error:", err);
    return [];
  }
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

export default async function ProduktePage() {
  const products = await getProducts();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-semibold">Produkte</h1>
        <Link href="/collections" className="text-sm underline">
          Kategorien
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
          {products.map((product) => (
            <div key={product.id} className="border rounded-xl overflow-hidden">
              <Link href={`/products/${product.handle}`} className="block">
                <div className="relative aspect-square bg-neutral-100">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.imageAlt ?? product.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-neutral-500">
                      Sem imagem
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-3 space-y-2">
                <Link href={`/products/${product.handle}`} className="block">
                  <div className="font-medium line-clamp-2">{product.title}</div>
                </Link>

                <div className="text-sm text-neutral-700">
                  <Price value={product.price} currency={product.currencyCode} />
                </div>

                {/* ✅ CORRETO: apenas variantId */}
                <AddToCartButton variantId={product.variantId} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
