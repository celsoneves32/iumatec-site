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
    query {
      products(first: 24) {
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

  const data = await shopifyFetch<ProductsQuery>({
    query,
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
        price: Number(variant.price.amount),
        currencyCode: variant.price.currencyCode,
        imageUrl: node.featuredImage?.url ?? null,
        imageAlt: node.featuredImage?.altText ?? node.title ?? null,
      } as Product;
    })
    .filter((p): p is Product => Boolean(p));
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
      <h1 className="text-2xl font-semibold">Produkte</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <div key={product.id} className="border rounded-xl overflow-hidden">
            <Link href={`/products/${product.handle}`}>
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
              <Link href={`/products/${product.handle}`}>
                <div className="font-medium line-clamp-2">
                  {product.title}
                </div>
              </Link>

              <Price
                value={product.price}
                currency={product.currencyCode}
              />

              {/* ✅ CORRETO: apenas variantId */}
              <AddToCartButton variantId={product.variantId} />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
